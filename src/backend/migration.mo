import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";

module {
  type TransactionType = {
    #Debit;
    #Credit;
  };

  type FlatOwner = {
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

  type Transaction = {
    id : Nat;
    flatOwnerId : Nat;
    date : Text;
    entryDate : Int;
    transactionType : TransactionType;
    description : Text;
    amount : Nat;
    createdBy : Text;
  };

  // New ExpenseVoucher type to be added
  type ExpenseVoucher = {
    id : Nat;
    voucherNo : Text;
    date : Text;
    entryDate : Int;
    category : Text;
    description : Text;
    amount : Nat;
    payee : Text;
    remarks : Text;
  };

  type OldActor = {
    flatOwners : Map.Map<Nat, FlatOwner>;
    transactions : Map.Map<Nat, Transaction>;
    nextFlatOwnerId : Nat;
    nextTransactionId : Nat;
  };

  type NewActor = {
    flatOwners : Map.Map<Nat, FlatOwner>;
    transactions : Map.Map<Nat, Transaction>;
    expenseVouchers : Map.Map<Nat, ExpenseVoucher>;
    nextFlatOwnerId : Nat;
    nextTransactionId : Nat;
    nextExpenseVoucherId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    {
      flatOwners = old.flatOwners;
      transactions = old.transactions;
      expenseVouchers = Map.empty<Nat, ExpenseVoucher>();
      nextFlatOwnerId = old.nextFlatOwnerId;
      nextTransactionId = old.nextTransactionId;
      nextExpenseVoucherId = 1;
    };
  };
};
