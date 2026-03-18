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
      transactions.add(k, v);
    };
    _flatOwnersStable := [];
    _transactionsStable := [];
  };

  // Save data to stable storage before upgrade
  system func preupgrade() {
    _flatOwnersStable := flatOwners.entries().toArray();
    _transactionsStable := transactions.entries().toArray();
  };

  module Transaction {
    public func compareByEntryDateDesc(t1 : Transaction, t2 : Transaction) : Order.Order {
      Int.compare(t2.entryDate, t1.entryDate);
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
      };
    };
  };

  public shared func deleteFlatOwner(id : Nat) : async () {
    if (not flatOwners.containsKey(id)) {
      Runtime.trap("Flat owner not found");
    };
    flatOwners.remove(id);
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
  };

  public shared func addManualTransaction(
    flatOwnerId : Nat,
    transactionType : TransactionType,
    description : Text,
    amount : Nat,
    monthYear : Text
  ) : async () {
    addTransactionInternal(flatOwnerId, monthYear, transactionType, description, amount, "admin");
  };

  public query func getFlatStatement(flatOwnerId : Nat) : async [Transaction] {
    transactions.values().toArray().filter(
      func(t) { t.flatOwnerId == flatOwnerId }
    ).sort(Transaction.compareByEntryDateDesc);
  };

  public query func getSocietyOverview() : async SocietyOverview {
    var totalPendingDues = 0;
    var totalCollected = 0;
    transactions.values().forEach(
      func(transaction) {
        switch (transaction.transactionType) {
          case (#Debit) { totalPendingDues += transaction.amount };
          case (#Credit) { totalCollected += transaction.amount };
        };
      }
    );
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
    var balance = 0;
    transactions.values().forEach(
      func(transaction) {
        if (transaction.flatOwnerId == ownerId) {
          switch (transaction.transactionType) {
            case (#Debit) { balance += transaction.amount };
            case (#Credit) { balance -= transaction.amount };
          };
        };
      }
    );
    balance;
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
  };
};
