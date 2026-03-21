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

// Apply data migration logic from migration.mo when upgrading

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

  public type ExpenseVoucher = {
    id : Nat;
    voucherNo : Text;
    date : Text;
    entryDate : Time.Time;
    category : Text;
    description : Text;
    amount : Nat;
    payee : Text;
    remarks : Text;
  };

  // ── In-memory working Maps ──
  let flatOwners = Map.empty<Nat, FlatOwner>();
  let transactions = Map.empty<Nat, Transaction>();
  let expenseVouchers = Map.empty<Nat, ExpenseVoucher>();

  // ── Stable storage: persists across upgrades ──
  stable var _flatOwnersStable : [(Nat, FlatOwner)] = [];
  stable var _transactionsStable : [(Nat, Transaction)] = [];
  stable var _expenseVouchersStable : [(Nat, ExpenseVoucher)] = [];
  stable var nextFlatOwnerId : Nat = 1;
  stable var nextTransactionId : Nat = 1;
  stable var nextExpenseVoucherId : Nat = 1;

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
    for ((k, v) in _expenseVouchersStable.vals()) {
      expenseVouchers.add(k, v);
    };
    // Sync stable after cleanup so orphans are permanently removed
    _flatOwnersStable := flatOwners.entries().toArray();
    _transactionsStable := transactions.entries().toArray();
    _expenseVouchersStable := expenseVouchers.entries().toArray();
  };

  // Save data to stable storage before upgrade
  system func preupgrade() {
    _flatOwnersStable := flatOwners.entries().toArray();
    _transactionsStable := transactions.entries().toArray();
    _expenseVouchersStable := expenseVouchers.entries().toArray();
  };

  // Sync helper: keeps stable arrays always up to date
  func syncStable() {
    _flatOwnersStable := flatOwners.entries().toArray();
    _transactionsStable := transactions.entries().toArray();
    _expenseVouchersStable := expenseVouchers.entries().toArray();
  };

  module Transaction {
    public func compareByEntryDateDesc(t1 : Transaction, t2 : Transaction) : Order.Order {
      Int.compare(t2.entryDate, t1.entryDate);
    };
    public func compareByEntryDateAsc(t1 : Transaction, t2 : Transaction) : Order.Order {
      Int.compare(t1.entryDate, t2.entryDate);
    };
  };

  module ExpenseVoucher {
    public func compareByEntryDateDesc(v1 : ExpenseVoucher, v2 : ExpenseVoucher) : Order.Order {
      Int.compare(v2.entryDate, v1.entryDate);
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

  // Helper to get flatOwnerId from user profile
  func getFlatOwnerIdForCaller(caller : Principal) : ?Nat {
    switch (userProfiles.get(caller)) {
      case (null) { null };
      case (?profile) { profile.flatOwnerId };
    };
  };

  // ╔══════════════════════════════╗
  // ║    Expense Voucher Logic     ║
  // ╚══════════════════════════════╝

  // Add new expense voucher
  public shared ({ caller }) func addExpenseVoucher(
    voucherNo : Text,
    date : Text,
    category : Text,
    description : Text,
    amount : Nat,
    payee : Text,
    remarks : Text
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can add vouchers");
    };
    let newId = nextExpenseVoucherId;
    let voucher : ExpenseVoucher = {
      id = newId;
      voucherNo;
      date;
      entryDate = Time.now();
      category;
      description;
      amount;
      payee;
      remarks;
    };
    expenseVouchers.add(newId, voucher);
    nextExpenseVoucherId += 1;
    syncStable();
    newId;
  };

  // Get all expense vouchers (sorted by most recent entry date first)
  public query ({ caller }) func getAllExpenseVouchers() : async [ExpenseVoucher] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only users can view expense vouchers");
    };
    expenseVouchers.values().toArray().sort(
      ExpenseVoucher.compareByEntryDateDesc
    );
  };

  // Delete an expense voucher by ID
  public shared ({ caller }) func deleteExpenseVoucher(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can delete vouchers");
    };
    if (not expenseVouchers.containsKey(id)) {
      Runtime.trap("Expense voucher not found");
    };
    expenseVouchers.remove(id);
    syncStable();
  };

  // ╔════════════════════════════════════╗
  // ║    Society Management Logic       ║
  // ╚════════════════════════════════════╝

  // Admin functions (access gated by frontend credential check)
  public shared ({ caller }) func createFlatOwner(
    blockNo : Text,
    flatNo : Text,
    ownerName : Text,
    phone : Text,
    maintenanceAmount : Nat,
    username : Text,
    passwordHash : Text
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can create flat owners");
    };
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

  public shared ({ caller }) func updateFlatOwner(
    id : Nat,
    blockNo : Text,
    flatNo : Text,
    ownerName : Text,
    phone : Text,
    maintenanceAmount : Nat
  ) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update flat owners");
    };
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
  public shared ({ caller }) func deleteFlatOwner(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can delete flat owners");
    };
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

  public query ({ caller }) func getAllFlatOwners() : async [FlatOwnerPublic] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only users can view flat owners");
    };
    flatOwners.values().toArray().map(func(owner) { toPublicFlatOwner(owner) });
  };

  // Update previously added maintenance amount as debit for a specific month/year
  public shared ({ caller }) func updateMaintenanceDebit(monthYear : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update maintenance");
    };
    flatOwners.values().forEach(
      func(owner) {
        if (not transactionExists(owner.id, monthYear, #Debit)) {
          addTransactionInternal(owner.id, monthYear, #Debit, "Monthly Maintenance - " # monthYear, owner.maintenanceAmount, "admin");
        };
      }
    );
    syncStable();
  };

  // Add manual transaction (credit or additional debit)
  public shared ({ caller }) func addManualTransaction(
    flatOwnerId : Nat,
    transactionType : TransactionType,
    description : Text,
    amount : Nat,
    monthYear : Text
  ) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can add manual transactions");
    };
    addTransactionInternal(flatOwnerId, monthYear, transactionType, description, amount, "admin");
    syncStable();
  };

  // Delete a transaction by ID
  public shared ({ caller }) func deleteTransaction(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can delete transactions");
    };
    if (not transactions.containsKey(id)) {
      Runtime.trap("Transaction not found");
    };
    transactions.remove(id);
    syncStable();
  };

  // Update (edit) an existing transaction
  public shared ({ caller }) func updateTransaction(
    id : Nat,
    transactionType : TransactionType,
    description : Text,
    amount : Nat,
    monthYear : Text
  ) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update transactions");
    };
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

  // Reset all financial data (transactions only) -- member profiles and maintenance amounts are preserved
  public shared ({ caller }) func resetFinancialData() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can reset financial data");
    };
    let allTxIds = transactions.keys().toArray();
    for (id in allTxIds.vals()) {
      transactions.remove(id);
    };
    nextTransactionId := 1;
    syncStable();
  };

  public query func getFlatStatement(flatOwnerId : Nat) : async [Transaction] {
    // Public: caller identified by flatOwnerId (password login does not use II)
    transactions.values().toArray().filter(
      func(t) { t.flatOwnerId == flatOwnerId }
    ).sort(Transaction.compareByEntryDateDesc);
  };

  // Returns ALL transactions across all owners (for society statement)
  public query ({ caller }) func getAllTransactions() : async [Transaction] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only users can view all transactions");
    };
    transactions.values().toArray().sort(Transaction.compareByEntryDateAsc);
  };

  public query ({ caller }) func getSocietyOverview() : async SocietyOverview {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only users can view society overview");
    };
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
        }
      }
    );
    let totalPendingDues : Nat = if (totalDebits > totalCollected) { totalDebits - totalCollected } else { 0 };
    {
      totalFlats = flatOwners.size();
      totalPendingDues;
      totalCollected;
    };
  };

  // ╔════════════════════════╗
  // ║      Owner Login      ║
  // ╚════════════════════════╝

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

  // Admin login with ephemeral principal (password verified, grants #admin to caller)
  public shared ({ caller }) func loginAdmin(password : Text) : async Bool {

    if (password != "ThirdEye@2026") { return false };
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    true
  };

  public query func getOwnerStatement(ownerId : Nat) : async [Transaction] {
    // Public: owner is identified by ownerId parameter (password login does not use II)
    transactions.values().toArray().filter(
      func(t) { t.flatOwnerId == ownerId }
    ).sort(Transaction.compareByEntryDateDesc);
  };

  public query func getOwnerBalance(ownerId : Nat) : async Nat {
    // Public: owner is identified by ownerId parameter (password login does not use II)
    var debits : Nat = 0;
    var credits : Nat = 0;
    transactions.values().forEach(
      func(transaction) {
        if (transaction.flatOwnerId == ownerId) {
          switch (transaction.transactionType) {
            case (#Debit) { debits += transaction.amount };
            case (#Credit) { credits += transaction.amount };
          };
        }
      }
    );
    if (debits > credits) { debits - credits } else { 0 };
  };

  // ╔══════════════════════════╗
  // ║    Helper functions     ║
  // ╚══════════════════════════╝

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
