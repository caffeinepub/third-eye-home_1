import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface FlatOwnerPublic {
    id: bigint;
    username: string;
    ownerName: string;
    flatNo: string;
    blockNo: string;
    createdAt: Time;
    phone: string;
    maintenanceAmount: bigint;
}
export type Time = bigint;
export interface ExpenseVoucher {
    id: bigint;
    entryDate: Time;
    date: string;
    description: string;
    category: string;
    payee: string;
    voucherNo: string;
    amount: bigint;
    remarks: string;
}
export interface SocietyOverview {
    totalFlats: bigint;
    totalCollected: bigint;
    totalPendingDues: bigint;
}
export interface Transaction {
    id: bigint;
    entryDate: Time;
    transactionType: TransactionType;
    date: string;
    createdBy: string;
    flatOwnerId: bigint;
    description: string;
    amount: bigint;
}
export enum TransactionType {
    Debit = "Debit",
    Credit = "Credit"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addExpenseVoucher(voucherNo: string, date: string, category: string, description: string, amount: bigint, payee: string, remarks: string): Promise<bigint>;
    addManualTransaction(flatOwnerId: bigint, transactionType: TransactionType, description: string, amount: bigint, monthYear: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createFlatOwner(blockNo: string, flatNo: string, ownerName: string, phone: string, maintenanceAmount: bigint, username: string, passwordHash: string): Promise<bigint>;
    deleteExpenseVoucher(id: bigint): Promise<void>;
    deleteFlatOwner(id: bigint): Promise<void>;
    deleteTransaction(id: bigint): Promise<void>;
    getAllExpenseVouchers(): Promise<Array<ExpenseVoucher>>;
    getAllFlatOwners(): Promise<Array<FlatOwnerPublic>>;
    getAllTransactions(): Promise<Array<Transaction>>;
    getCallerUserRole(): Promise<UserRole>;
    getFlatStatement(flatOwnerId: bigint): Promise<Array<Transaction>>;
    getOwnerBalance(ownerId: bigint): Promise<bigint>;
    getOwnerStatement(ownerId: bigint): Promise<Array<Transaction>>;
    getSocietyOverview(): Promise<SocietyOverview>;
    isCallerAdmin(): Promise<boolean>;
    loginOwner(username: string, password: string): Promise<FlatOwnerPublic | null>;
    loginAdmin(password: string): Promise<boolean>;
    resetFinancialData(): Promise<void>;
    updateFlatOwner(id: bigint, blockNo: string, flatNo: string, ownerName: string, phone: string, maintenanceAmount: bigint): Promise<void>;
    updateMaintenanceDebit(monthYear: string): Promise<void>;
    updateTransaction(id: bigint, transactionType: TransactionType, description: string, amount: bigint, monthYear: string): Promise<void>;
}
