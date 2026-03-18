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
export interface SocietyOverview {
    totalFlats: bigint;
    totalCollected: bigint;
    totalPendingDues: bigint;
}
export interface UserProfile {
    name: string;
    flatOwnerId?: bigint;
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
    addManualTransaction(flatOwnerId: bigint, transactionType: TransactionType, description: string, amount: bigint, monthYear: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createFlatOwner(blockNo: string, flatNo: string, ownerName: string, phone: string, maintenanceAmount: bigint, username: string, passwordHash: string): Promise<bigint>;
    deleteFlatOwner(id: bigint): Promise<void>;
    getAllFlatOwners(): Promise<Array<FlatOwnerPublic>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFlatStatement(flatOwnerId: bigint): Promise<Array<Transaction>>;
    getMyBalance(): Promise<bigint>;
    getMyProfile(): Promise<FlatOwnerPublic>;
    getMyStatement(): Promise<Array<Transaction>>;
    getSocietyOverview(): Promise<SocietyOverview>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    linkOwnerToPrincipal(ownerId: bigint, ownerPrincipal: Principal): Promise<void>;
    loginOwner(username: string, password: string): Promise<FlatOwnerPublic | null>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateFlatOwner(id: bigint, blockNo: string, flatNo: string, ownerName: string, phone: string, maintenanceAmount: bigint): Promise<void>;
    updateMaintenanceDebit(monthYear: string): Promise<void>;
}
