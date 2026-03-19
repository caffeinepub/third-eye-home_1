import Map "mo:core/Map";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // ── Kept for stable-variable compatibility with previous version ──
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
    flatOwnerId : ?Nat;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let principalToFlatOwnerId = Map.empty<Principal, Nat>();
  // ─────────────────────────────────────────────────────────────────

  type TransactionType = {
    #Debit;
    #Credit;
  };

  type SocietyOverview = {
    totalFlats : Nat;
    totalPendingDues : Nat;
    totalCollected : Nat;
  };

  public type FlatOwner = {
    id : Nat;
    blockNo : Text;
    flatNo : Text;
    ownerName : Text;
    phone : Text;
    maintenanceAmount : Nat;
    username : Text;
    passwordHash : Text;
    createdAt : Time.Time;
  };

  public type FlatOwnerPublic = {
    id : Nat;
    blockNo : Text;
    flatNo : Text;
    ownerName : Text;
    phone : Text;
    maintenanceAmount : Nat;
    username : Text;
    createdAt : Time.Time;
  };

  public type Transaction = {
    id : Nat;
    flatOwnerId : Nat;
    date : Text;
    entryDate : Time.Time;
    transactionType : TransactionType;
    description : Text;
    amount : Nat;
    createdBy : Text;
  };

  // ── In-memory working Maps ──
  let flatOwners = Map.empty<Nat, FlatOwner>();
  let transactions = Map.empty<Nat, Transaction>();

  // ── Stable storage: persists across upgrades ──
  stable var _flatOwnersStable : [(Nat, FlatOwner)] = [];
  stable var _transactionsStable : [(Nat, Transaction)] = [];
  stable var nextFlatOwnerId : Nat = 1;
  stable var nextTransactionId : Nat = 1;

  // Restore data from stable storage after upgrade
  system func postupgrade() {
    for ((k, v) in _flatOwnersStable.vals()) {
      flatOwners.add(k, v);
    };
    for ((k, v) in _transactionsStable.vals()) {
      // Only restore transactions for owners that still exist (skip orphans)
      if (flatOwners.containsKey(v.flatOwnerId)) {
        transactions.add(k, v);
      };
    };
    // Sync stable after cleanup so orphans are permanently removed
    _flatOwnersStable := flatOwners.entries().toArray();
    _transactionsStable := transactions.entries().toArray();
  };

  // Save data to stable storage before upgrade
  system func preupgrade() {
    _flatOwnersStable := flatOwners.entries().toArray();
    _transactionsStable := transactions.entries().toArray();
  };

  // Sync helper: keeps stable arrays always up to date
  func syncStable() {
    _flatOwnersStable := flatOwners.entries().toArray();
    _transactionsStable := transactions.entries().toArray();
  };

  module Transaction {
    public func compareByEntryDateDesc(t1 : Transaction, t2 : Transaction) : Order.Order {
      Int.compare(t2.entryDate, t1.entryDate);
    };
    public func compareByEntryDateAsc(t1 : Transaction, t2 : Transaction) : Order.Order {
      Int.compare(t1.entryDate, t2.entryDate);
    };
  };

  func toPublicFlatOwner(owner : FlatOwner) : FlatOwnerPublic {
    {
      id = owner.id;
      blockNo = owner.blockNo;
      flatNo = owner.flatNo;
      ownerName = owner.ownerName;
      phone = owner.phone;
      maintenanceAmount = owner.maintenanceAmount;
      username = owner.username;
      createdAt = owner.createdAt;
    };
  };

  // Admin functions (access gated by frontend credential check)
  public shared func createFlatOwner(
    blockNo : Text,
    flatNo : Text,
    ownerName : Text,
    phone : Text,
    maintenanceAmount : Nat,
    username : Text,
    passwordHash : Text
  ) : async Nat {
    let id = nextFlatOwnerId;
    let owner : FlatOwner = {
      id;
      blockNo;
      flatNo;
      ownerName;
      phone;
      maintenanceAmount;
      username;
      passwordHash;
      createdAt = Time.now();
    };
    flatOwners.add(id, owner);
    nextFlatOwnerId += 1;
    syncStable();
    id;
  };

  public shared func updateFlatOwner(
    id : Nat,
    blockNo : Text,
    flatNo : Text,
    ownerName : Text,
    phone : Text,
    maintenanceAmount : Nat
  ) : async () {
    switch (flatOwners.get(id)) {
      case (null) { Runtime.trap("Flat owner not found") };
      case (?owner) {
        let updatedOwner : FlatOwner = {
          id;
          blockNo;
          flatNo;
          ownerName;
          phone;
          maintenanceAmount;
          username = owner.username;
          passwordHash = owner.passwordHash;
          createdAt = owner.createdAt;
        };
        flatOwners.add(id, updatedOwner);
        syncStable();
      };
    };
  };

  // Delete flat owner AND all their transactions (cascade delete)
  public shared func deleteFlatOwner(id : Nat) : async () {
    if (not flatOwners.containsKey(id)) {
      Runtime.trap("Flat owner not found");
    };
    flatOwners.remove(id);
    // Remove all transactions belonging to this owner
    let toDelete = transactions.values().toArray().filter(
      func(t : Transaction) : Bool { t.flatOwnerId == id }
    );
    for (tx in toDelete.vals()) {
      transactions.remove(tx.id);
    };
    syncStable();
  };

  public query func getAllFlatOwners() : async [FlatOwnerPublic] {
    flatOwners.values().toArray().map(func(owner) { toPublicFlatOwner(owner) });
  };

  public shared func updateMaintenanceDebit(monthYear : Text) : async () {
    flatOwners.values().forEach(
      func(owner) {
        if (not transactionExists(owner.id, monthYear, #Debit)) {
          addTransactionInternal(owner.id, monthYear, #Debit, "Monthly Maintenance - " # monthYear, owner.maintenanceAmount, "admin");
        };
      }
    );
    syncStable();
  };

  public shared func addManualTransaction(
    flatOwnerId : Nat,
    transactionType : TransactionType,
    description : Text,
    amount : Nat,
    monthYear : Text
  ) : async () {
    addTransactionInternal(flatOwnerId, monthYear, transactionType, description, amount, "admin");
    syncStable();
  };

  // Delete a transaction by ID
  public shared func deleteTransaction(id : Nat) : async () {
    if (not transactions.containsKey(id)) {
      Runtime.trap("Transaction not found");
    };
    transactions.remove(id);
    syncStable();
  };

  // Update (edit) an existing transaction
  public shared func updateTransaction(
    id : Nat,
    transactionType : TransactionType,
    description : Text,
    amount : Nat,
    monthYear : Text
  ) : async () {
    switch (transactions.get(id)) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?tx) {
        let updated : Transaction = {
          id = tx.id;
          flatOwnerId = tx.flatOwnerId;
          date = monthYear;
          entryDate = tx.entryDate;
          transactionType;
          description;
          amount;
          createdBy = tx.createdBy;
        };
        transactions.add(id, updated);
        syncStable();
      };
    };
  };

  public query func getFlatStatement(flatOwnerId : Nat) : async [Transaction] {
    transactions.values().toArray().filter(
      func(t) { t.flatOwnerId == flatOwnerId }
    ).sort(Transaction.compareByEntryDateDesc);
  };

  // Returns ALL transactions across all owners (for society statement)
  public query func getAllTransactions() : async [Transaction] {
    transactions.values().toArray().sort(Transaction.compareByEntryDateAsc);
  };

  public query func getSocietyOverview() : async SocietyOverview {
    var totalDebits : Nat = 0;
    var totalCollected : Nat = 0;
    // Only count transactions for owners that currently exist (skip orphans)
    transactions.values().forEach(
      func(transaction) {
        if (flatOwners.containsKey(transaction.flatOwnerId)) {
          switch (transaction.transactionType) {
            case (#Debit) { totalDebits += transaction.amount };
            case (#Credit) { totalCollected += transaction.amount };
          };
        };
      }
    );
    let totalPendingDues : Nat = if (totalDebits > totalCollected) { totalDebits - totalCollected } else { 0 };
    {
      totalFlats = flatOwners.size();
      totalPendingDues;
      totalCollected;
    };
  };

  // Owner login (public, no principal required)
  public query func loginOwner(username : Text, password : Text) : async ?FlatOwnerPublic {
    switch (flatOwners.values().find(
      func(owner) {
        owner.username == username and owner.passwordHash == password;
      }
    )) {
      case (null) { null };
      case (?owner) { ?toPublicFlatOwner(owner) };
    };
  };

  public query func getOwnerStatement(ownerId : Nat) : async [Transaction] {
    transactions.values().toArray().filter(
      func(t) { t.flatOwnerId == ownerId }
    ).sort(Transaction.compareByEntryDateDesc);
  };

  public query func getOwnerBalance(ownerId : Nat) : async Nat {
    var debits : Nat = 0;
    var credits : Nat = 0;
    transactions.values().forEach(
      func(transaction) {
        if (transaction.flatOwnerId == ownerId) {
          switch (transaction.transactionType) {
            case (#Debit) { debits += transaction.amount };
            case (#Credit) { credits += transaction.amount };
          };
        };
      }
    );
    if (debits > credits) { debits - credits } else { 0 };
  };

  // Helper functions
  func transactionExists(flatOwnerId : Nat, monthYear : Text, transactionType : TransactionType) : Bool {
    transactions.values().toArray().any(
      func(t) {
        t.flatOwnerId == flatOwnerId and t.date == monthYear and t.transactionType == transactionType
      }
    );
  };

  func addTransactionInternal(
    flatOwnerId : Nat,
    monthYear : Text,
    transactionType : TransactionType,
    description : Text,
    amount : Nat,
    createdBy : Text,
  ) {
    let id = nextTransactionId;
    let transaction : Transaction = {
      id;
      flatOwnerId;
      date = monthYear;
      entryDate = Time.now();
      transactionType;
      description;
      amount;
      createdBy;
    };
    transactions.add(id, transaction);
    nextTransactionId += 1;
    // Note: caller is responsible for calling syncStable() after batch operations
  };
};
