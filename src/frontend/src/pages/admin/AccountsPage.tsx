import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  ExpenseVoucher,
  FlatOwnerPublic as FlatOwner,
  Transaction,
} from "../../backend.d";
import { TransactionType } from "../../backend.d";
import { useAdminActor } from "../../contexts/AdminActorContext";
import { formatDate, formatINR, getCurrentMonthYear } from "../../utils/format";
import { numberToWords } from "../../utils/numberToWords";

type FilterPreset = "all" | "last-month" | "last-365" | "custom";

function loadCategories(key: string, defaults: string[]): string[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaults;
  } catch {
    return defaults;
  }
}

const DEFAULT_EXPENSE_CATEGORIES = [
  "Monthly Maintenance",
  "Water Charges",
  "Electricity",
  "Repair & Maintenance",
  "Society Fund",
  "Other",
];
const DEFAULT_PAYMENT_CATEGORIES = [
  "Maintenance Payment",
  "Advance Payment",
  "Penalty Waiver",
  "Adjustment Credit",
  "Other",
];

function getEntryDateMs(entryDate: bigint | string): number {
  if (typeof entryDate === "string") return new Date(entryDate).getTime();
  return Number(entryDate) / 1_000_000;
}

function applyDateFilter(
  txns: Transaction[],
  preset: FilterPreset,
  dateFrom: string,
  dateTo: string,
): Transaction[] {
  const now = Date.now();
  return txns.filter((t) => {
    const ms = getEntryDateMs(t.entryDate);
    if (preset === "last-month") return ms >= now - 30 * 24 * 60 * 60 * 1000;
    if (preset === "last-365") return ms >= now - 365 * 24 * 60 * 60 * 1000;
    if (preset === "custom") {
      const from = dateFrom ? new Date(dateFrom).getTime() : 0;
      const to = dateTo
        ? new Date(dateTo).getTime() + 86400000
        : Number.POSITIVE_INFINITY;
      return ms >= from && ms <= to;
    }
    return true;
  });
}

export default function AccountsPage() {
  const { actor, isFetching } = useAdminActor();
  const [activeTab, setActiveTab] = useState<
    "individual" | "society" | "expense" | "receipts"
  >("individual");

  // Individual account state
  const [owners, setOwners] = useState<FlatOwner[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [statement, setStatement] = useState<Transaction[]>([]);
  const [loadingStmt, setLoadingStmt] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: TransactionType.Debit,
    description: "",
    amount: "",
    monthYear: getCurrentMonthYear(),
  });
  const printRef = useRef<HTMLDivElement>(null);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTransactionId, setEditTransactionId] = useState<bigint | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    type: TransactionType.Debit,
    description: "",
    amount: "",
    monthYear: getCurrentMonthYear(),
  });
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<bigint | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // Society statement state
  const [societyOwners, setSocietyOwners] = useState<FlatOwner[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loadingSociety, setLoadingSociety] = useState(false);
  const [societyLoaded, setSocietyLoaded] = useState(false);

  // Expense voucher state
  const [expenseVouchers, setExpenseVouchers] = useState<ExpenseVoucher[]>([]);
  const [loadingExpense, setLoadingExpense] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "",
    description: "",
    amount: "",
    payee: "",
    remarks: "",
  });
  const [showExpenseDeleteConfirm, setShowExpenseDeleteConfirm] =
    useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<bigint | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [printVoucher, setPrintVoucher] = useState<ExpenseVoucher | null>(null);
  const expensePrintRef = useRef<HTMLDivElement>(null);

  // Receipts tab state
  const [receiptsOwners, setReceiptsOwners] = useState<FlatOwner[]>([]);
  const [receiptsTransactions, setReceiptsTransactions] = useState<
    Transaction[]
  >([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  // Date filter state — Individual tab filter
  const [indivFilter, setIndivFilter] = useState<FilterPreset>("all");
  const [indivDateFrom, setIndivDateFrom] = useState("");
  const [indivDateTo, setIndivDateTo] = useState("");

  // Society tab filter
  const [socFilter, setSocFilter] = useState<FilterPreset>("all");
  const [socDateFrom, setSocDateFrom] = useState("");
  const [socDateTo, setSocDateTo] = useState("");

  useEffect(() => {
    if (!actor || isFetching) return;
    actor
      .getAllFlatOwners()
      .then(setOwners)
      .catch(() => null);
  }, [actor, isFetching]);

  const loadStatement = useCallback(async () => {
    if (!actor || !selectedId) return;
    setLoadingStmt(true);
    try {
      const updated = await actor.getFlatStatement(BigInt(selectedId));
      setStatement(updated);
    } catch {
      toast.error("Failed to load statement");
    } finally {
      setLoadingStmt(false);
    }
  }, [actor, selectedId]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const loadSocietyStatement = useCallback(async () => {
    if (!actor || isFetching) return;
    setLoadingSociety(true);
    try {
      const [fetchedOwners, fetchedTxns] = await Promise.all([
        actor.getAllFlatOwners(),
        actor.getAllTransactions(),
      ]);
      const sorted = [...fetchedOwners].sort((a, b) => {
        const keyA = `${a.blockNo}-${a.flatNo}`;
        const keyB = `${b.blockNo}-${b.flatNo}`;
        return keyA.localeCompare(keyB);
      });
      setSocietyOwners(sorted);
      setAllTransactions(fetchedTxns);
      setSocietyLoaded(true);
    } catch {
      toast.error("Failed to load society statement");
    } finally {
      setLoadingSociety(false);
    }
  }, [actor, isFetching]);

  useEffect(() => {
    if (activeTab === "society" && !societyLoaded && actor && !isFetching) {
      loadSocietyStatement();
    }
  }, [activeTab, societyLoaded, actor, isFetching, loadSocietyStatement]);

  // Compute running balance rows — oldest first, newest last
  const filteredIndivStatement = useMemo(
    () => applyDateFilter(statement, indivFilter, indivDateFrom, indivDateTo),
    [statement, indivFilter, indivDateFrom, indivDateTo],
  );

  const chronological = [...filteredIndivStatement].reverse();
  const rows = chronological.map((t, i) => {
    const runningBalance = chronological.slice(0, i + 1).reduce((acc, tx) => {
      return tx.transactionType === TransactionType.Debit
        ? acc + Number(tx.amount)
        : acc - Number(tx.amount);
    }, 0);
    return { ...t, runningBalance };
  });

  const pendingBalance =
    rows.length > 0 ? rows[rows.length - 1].runningBalance : 0;
  const totalDebit = filteredIndivStatement
    .filter((t) => t.transactionType === TransactionType.Debit)
    .reduce((a, t) => a + Number(t.amount), 0);
  const totalCredit = filteredIndivStatement
    .filter((t) => t.transactionType === TransactionType.Credit)
    .reduce((a, t) => a + Number(t.amount), 0);

  // Society computations with date filter
  const societyData = useMemo(
    () =>
      societyOwners.map((owner) => {
        const rawTxns = [...allTransactions]
          .filter((t) => t.flatOwnerId.toString() === owner.id.toString())
          .sort((a, b) => Number(a.entryDate) - Number(b.entryDate));

        const ownerTxns = applyDateFilter(
          rawTxns,
          socFilter,
          socDateFrom,
          socDateTo,
        );

        let running = 0;
        const ownerRows = ownerTxns.map((t) => {
          if (t.transactionType === TransactionType.Debit)
            running += Number(t.amount);
          else running -= Number(t.amount);
          return { ...t, runningBalance: running };
        });

        const ownerDebit = ownerTxns
          .filter((t) => t.transactionType === TransactionType.Debit)
          .reduce((s, t) => s + Number(t.amount), 0);
        const ownerCredit = ownerTxns
          .filter((t) => t.transactionType === TransactionType.Credit)
          .reduce((s, t) => s + Number(t.amount), 0);
        const ownerBalance =
          ownerRows.length > 0
            ? ownerRows[ownerRows.length - 1].runningBalance
            : 0;

        return { owner, ownerRows, ownerDebit, ownerCredit, ownerBalance };
      }),
    [societyOwners, allTransactions, socFilter, socDateFrom, socDateTo],
  );

  const grandDebit = societyData.reduce((s, d) => s + d.ownerDebit, 0);
  const grandCredit = societyData.reduce((s, d) => s + d.ownerCredit, 0);
  const grandBalance = societyData.reduce((s, d) => s + d.ownerBalance, 0);
  const flatsWithDues = societyData.filter((d) => d.ownerBalance > 0).length;

  const handleAddEntry = async () => {
    if (!actor || !selectedId) return;
    setSaving(true);
    try {
      await actor.addManualTransaction(
        BigInt(selectedId),
        form.type,
        form.description,
        BigInt(form.amount || "0"),
        form.monthYear,
      );
      toast.success("Transaction added");
      setShowModal(false);
      await loadStatement();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add entry");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (t: (typeof rows)[0]) => {
    setEditTransactionId(BigInt(t.id));
    setEditForm({
      type: t.transactionType as TransactionType,
      description: t.description,
      amount: Number(t.amount).toString(),
      monthYear: t.date || getCurrentMonthYear(),
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!actor || editTransactionId === null) return;
    setEditSaving(true);
    try {
      await actor.updateTransaction(
        editTransactionId,
        editForm.type,
        editForm.description,
        BigInt(editForm.amount || "0"),
        editForm.monthYear,
      );
      toast.success("Entry updated");
      setShowEditModal(false);
      await loadStatement();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update entry");
    } finally {
      setEditSaving(false);
    }
  };

  const openDeleteConfirm = (id: bigint) => {
    setDeleteTransactionId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!actor || deleteTransactionId === null) return;
    setDeleting(true);
    try {
      await actor.deleteTransaction(deleteTransactionId);
      toast.success("Entry deleted");
      setShowDeleteConfirm(false);
      setDeleteTransactionId(null);
      await loadStatement();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete entry");
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const originalTitle = document.title;
    document.title = `Statement_${selectedOwner ? `${selectedOwner.blockNo}-${selectedOwner.flatNo}` : ""}_${new Date().toLocaleDateString("en-IN")}`;
    window.print();
    document.title = originalTitle;
  };

  const handleSocietyPrint = () => {
    window.print();
  };

  const handleSocietyPDF = () => {
    const originalTitle = document.title;
    document.title = `Society_Statement_${new Date().toLocaleDateString("en-IN")}`;
    window.print();
    document.title = originalTitle;
  };

  const selectedOwner = owners.find((o) => o.id.toString() === selectedId);
  const balanceClass = pendingBalance > 0 ? "text-red-600" : "text-green-600";
  const printDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      {/* Print-only global style */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #tally-statement, #tally-statement * { visibility: visible !important; }
          #society-statement, #society-statement * { visibility: visible !important; }
          #tally-statement { position: fixed; top: 0; left: 0; width: 100%; }
          #society-statement { position: fixed; top: 0; left: 0; width: 100%; }
          #expense-voucher-print { position: absolute; left: 0; top: 0; width: 100%; }
          #expense-voucher-print, #expense-voucher-print * { visibility: visible !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-5">
        {/* Tab switcher */}
        <div className="no-print flex gap-2">
          <button
            type="button"
            data-ocid="accounts.individual.tab"
            onClick={() => setActiveTab("individual")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === "individual"
                ? "bg-primary text-white shadow"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            Individual Account
          </button>
          <button
            type="button"
            data-ocid="accounts.society.tab"
            onClick={() => setActiveTab("society")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === "society"
                ? "bg-primary text-white shadow"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            Society Statement
          </button>
          <button
            type="button"
            data-ocid="accounts.expense.tab"
            onClick={() => {
              setActiveTab("expense");
              if (actor && !isFetching) {
                setLoadingExpense(true);
                actor
                  .getAllExpenseVouchers()
                  .then((v) =>
                    setExpenseVouchers(
                      [...v].sort(
                        (a, b) => Number(b.entryDate) - Number(a.entryDate),
                      ),
                    ),
                  )
                  .catch(() => toast.error("Failed to load expense vouchers"))
                  .finally(() => setLoadingExpense(false));
              }
            }}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === "expense"
                ? "bg-primary text-white shadow"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            Expense Entry
          </button>
          <button
            type="button"
            data-ocid="accounts.receipts.tab"
            onClick={() => {
              setActiveTab("receipts");
              if (actor && !isFetching) {
                setLoadingReceipts(true);
                Promise.all([
                  actor.getAllFlatOwners(),
                  actor.getAllTransactions(),
                ])
                  .then(([ownersData, txnsData]) => {
                    setReceiptsOwners(ownersData);
                    setReceiptsTransactions(txnsData);
                  })
                  .catch(() => toast.error("Failed to load receipts"))
                  .finally(() => setLoadingReceipts(false));
              }
            }}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === "receipts"
                ? "bg-primary text-white shadow"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            Receipts
          </button>
        </div>

        {/* ======================== INDIVIDUAL ACCOUNT TAB ======================== */}
        {activeTab === "individual" && (
          <>
            {/* Flat selector */}
            <div className="bg-card rounded-xl border border-border shadow-card p-5 no-print">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-48">
                  <Label className="text-xs mb-1 block">
                    Select Flat Owner
                  </Label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger
                      data-ocid="accounts.owner.select"
                      className="h-9"
                    >
                      <SelectValue placeholder="Choose a flat owner…" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map((o) => (
                        <SelectItem
                          key={o.id.toString()}
                          value={o.id.toString()}
                        >
                          {o.blockNo}-{o.flatNo} — {o.ownerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedId && (
                  <>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        Pending Balance
                      </p>
                      <p className={`text-lg font-bold ${balanceClass}`}>
                        {formatINR(pendingBalance)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-auto">
                      <Button
                        variant="outline"
                        onClick={handlePrint}
                        className="h-9 text-sm gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleDownloadPDF}
                        className="h-9 text-sm gap-2"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </Button>
                      <Button
                        data-ocid="accounts.add.button"
                        onClick={() => {
                          setShowModal(true);
                          setSelectedCategory("");
                        }}
                        className="bg-primary text-white h-9 text-sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Entry
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Date Filter Bar — Individual */}
            {selectedId && (
              <div className="bg-card rounded-xl border border-border p-4 no-print space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground font-semibold mr-1">
                    Duration:
                  </span>
                  {(
                    [
                      "all",
                      "last-month",
                      "last-365",
                      "custom",
                    ] as FilterPreset[]
                  ).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setIndivFilter(p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        indivFilter === p
                          ? "bg-primary text-white shadow"
                          : "border border-border bg-muted text-foreground hover:bg-muted/70"
                      }`}
                    >
                      {p === "all"
                        ? "All Time"
                        : p === "last-month"
                          ? "Last Month"
                          : p === "last-365"
                            ? "Last 365 Days"
                            : "Custom Range"}
                    </button>
                  ))}
                </div>
                {indivFilter === "custom" && (
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="indiv-from"
                        className="text-xs text-muted-foreground"
                      >
                        From:
                      </label>
                      <input
                        id="indiv-from"
                        type="date"
                        value={indivDateFrom}
                        onChange={(e) => setIndivDateFrom(e.target.value)}
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="indiv-to"
                        className="text-xs text-muted-foreground"
                      >
                        To:
                      </label>
                      <input
                        id="indiv-to"
                        type="date"
                        value={indivDateTo}
                        onChange={(e) => setIndivDateTo(e.target.value)}
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tally-style Statement */}
            {selectedId && (
              <div
                id="tally-statement"
                ref={printRef}
                className="bg-white border border-gray-300 rounded-xl overflow-hidden"
              >
                {/* Statement Header */}
                <div className="border-b border-gray-300 p-5 text-center">
                  <h1 className="text-xl font-bold uppercase tracking-wide text-gray-800">
                    THIRD EYE HOME
                  </h1>
                  <p className="text-sm text-gray-500">
                    Society Maintenance Statement
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-x-8 text-sm text-left max-w-lg mx-auto">
                    <div>
                      <span className="text-gray-500">Flat No:</span>{" "}
                      <span className="font-semibold">
                        {selectedOwner?.blockNo}-{selectedOwner?.flatNo}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Owner:</span>{" "}
                      <span className="font-semibold">
                        {selectedOwner?.ownerName}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-gray-500">Print Date:</span>{" "}
                      <span className="font-semibold">{printDate}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-gray-500">Period:</span>{" "}
                      <span className="font-semibold">
                        {indivFilter === "all" && "All Time"}
                        {indivFilter === "last-month" && "Last 30 Days"}
                        {indivFilter === "last-365" && "Last 365 Days"}
                        {indivFilter === "custom" &&
                          `${indivDateFrom || "—"} to ${indivDateTo || "—"}`}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-gray-500">Contact:</span>{" "}
                      <span className="font-semibold">
                        {selectedOwner?.phone || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {loadingStmt ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                  </div>
                ) : rows.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No transactions found for this flat.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-800 text-white">
                            <th className="border border-gray-600 px-3 py-2 text-left font-semibold w-8">
                              #
                            </th>
                            <th className="border border-gray-600 px-3 py-2 text-left font-semibold">
                              Date
                            </th>
                            <th className="border border-gray-600 px-3 py-2 text-left font-semibold">
                              Particulars / Description
                            </th>
                            <th className="border border-gray-600 px-3 py-2 text-left font-semibold">
                              Vch Type
                            </th>
                            <th className="border border-gray-600 px-3 py-2 text-right font-semibold">
                              Debit (₹)
                            </th>
                            <th className="border border-gray-600 px-3 py-2 text-right font-semibold">
                              Credit (₹)
                            </th>
                            <th className="border border-gray-600 px-3 py-2 text-right font-semibold">
                              Balance Due (₹)
                            </th>
                            <th className="border border-gray-600 px-3 py-2 text-center font-semibold no-print">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((t, i) => {
                            const isDebit =
                              t.transactionType === TransactionType.Debit;
                            const rowBg =
                              i % 2 === 0 ? "bg-white" : "bg-gray-50";
                            const isLastEntry = i === rows.length - 1;
                            return (
                              <tr key={t.id.toString()} className={rowBg}>
                                <td className="border border-gray-200 px-3 py-2 text-gray-500">
                                  {i + 1}
                                </td>
                                <td className="border border-gray-200 px-3 py-2 text-gray-600 whitespace-nowrap">
                                  {formatDate(t.entryDate)}
                                </td>
                                <td className="border border-gray-200 px-3 py-2">
                                  {t.description}
                                </td>
                                <td className="border border-gray-200 px-3 py-2">
                                  <span
                                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                      isDebit
                                        ? "bg-red-100 text-red-700"
                                        : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {isDebit ? "Debit Note" : "Receipt"}
                                  </span>
                                </td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-mono">
                                  {isDebit ? (
                                    <span className="text-red-600 font-medium">
                                      {Number(t.amount).toLocaleString("en-IN")}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-mono">
                                  {!isDebit ? (
                                    <span className="text-green-600 font-medium">
                                      {Number(t.amount).toLocaleString("en-IN")}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-mono">
                                  <span
                                    className={
                                      t.runningBalance > 0
                                        ? "text-red-600 font-semibold"
                                        : "text-green-600 font-semibold"
                                    }
                                  >
                                    {t.runningBalance.toLocaleString("en-IN")}
                                    {t.runningBalance > 0 ? " Dr" : " Cr"}
                                  </span>
                                </td>
                                <td className="border border-gray-200 px-3 py-2 text-center no-print">
                                  <div className="flex items-center justify-center gap-1">
                                    {!isDebit && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!selectedOwner) return;
                                          const receiptNo = `RCP-${String(Number(t.id)).padStart(5, "0")}`;
                                          const amountNum = Number(t.amount);
                                          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt ${receiptNo}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#fff;color:#111}.receipt{max-width:600px;margin:0 auto;border:2px solid #1a1a2e;border-radius:8px;overflow:hidden}.header{background:#1a1a2e;color:white;padding:20px 24px;text-align:center}.header h1{margin:0;font-size:22px;letter-spacing:2px}.header p{margin:4px 0 0;font-size:13px;color:#aaa}.receipt-no{background:#f5f5f5;border-bottom:1px solid #ddd;padding:10px 24px;display:flex;justify-content:space-between;font-size:13px}.body{padding:20px 24px}.section{margin-bottom:16px}.section label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px}.section .value{font-size:14px;font-weight:600;color:#111;margin-top:2px}.amount-box{background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:16px 20px;text-align:center;margin:20px 0}.amount-box .amt{font-size:32px;font-weight:800;color:#16a34a}.amount-box .words{font-size:13px;color:#444;margin-top:4px;font-style:italic}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.thanks{text-align:center;padding:16px;background:#fafafa;border-top:1px solid #eee;font-size:13px;color:#555}.sig{display:flex;justify-content:flex-end;padding:16px 24px 20px}.sig-box{text-align:center}.sig-line{border-top:1px solid #333;width:180px;margin:0 auto 4px}.sig-label{font-size:11px;color:#666}@media print{body{padding:0}}</style></head><body><div class="receipt"><div class="header"><h1>THIRD EYE HOME</h1><p>Payment Receipt</p></div><div class="receipt-no"><span><strong>Receipt No:</strong> ${receiptNo}</span><span><strong>Date:</strong> ${formatDate(t.entryDate)}</span></div><div class="body"><div class="section"><label>Flat Details</label><div class="grid2"><div class="value">Flat: ${selectedOwner.blockNo}-${selectedOwner.flatNo}</div><div class="value">Owner: ${selectedOwner.ownerName}</div></div></div><div class="amount-box"><div class="amt">&#8377;${amountNum.toLocaleString("en-IN")}</div><div class="words">${numberToWords(amountNum)} Only</div></div><div class="section"><label>Description / Payment Category</label><div class="value">${t.description}</div></div></div><div class="thanks">Received with thanks</div><div class="sig"><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Authorized Signatory</div></div></div></div><script>window.onload=function(){window.print();}<\/script></body></html>`;
                                          const w = window.open(
                                            "",
                                            "_blank",
                                            "width=700,height=600",
                                          );
                                          if (w) {
                                            w.document.write(html);
                                            w.document.close();
                                          }
                                        }}
                                        className="p-1.5 rounded hover:bg-green-50 text-green-600 hover:text-green-700 transition-colors"
                                        title="Print/Download Receipt"
                                        data-ocid={`accounts.receipt.${i + 1}`}
                                      >
                                        <Receipt className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {isLastEntry && (
                                      <button
                                        type="button"
                                        data-ocid="accounts.edit_button.1"
                                        onClick={() => openEditModal(t)}
                                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                                        title="Edit this entry"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {isLastEntry && (
                                      <button
                                        type="button"
                                        data-ocid="accounts.delete_button.1"
                                        onClick={() =>
                                          openDeleteConfirm(BigInt(t.id))
                                        }
                                        className="p-1.5 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                                        title="Delete this entry"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-gray-100 font-bold">
                            <td
                              colSpan={4}
                              className="border border-gray-300 px-3 py-2 text-right text-gray-700 uppercase text-xs tracking-wide"
                            >
                              Totals
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-mono text-red-700">
                              {totalDebit.toLocaleString("en-IN")}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-mono text-green-700">
                              {totalCredit.toLocaleString("en-IN")}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                              <span
                                className={
                                  pendingBalance > 0
                                    ? "text-red-700"
                                    : "text-green-700"
                                }
                              >
                                {Math.abs(pendingBalance).toLocaleString(
                                  "en-IN",
                                )}
                                {pendingBalance > 0 ? " Dr" : " Cr"}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-3 py-2 no-print" />
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t border-gray-300 bg-gray-50 px-5 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                            Closing Balance Due
                          </p>
                          <p
                            className="text-2xl font-bold mt-0.5"
                            style={{
                              color: pendingBalance > 0 ? "#dc2626" : "#16a34a",
                            }}
                          >
                            {formatINR(Math.abs(pendingBalance))}
                            <span className="text-base font-semibold ml-2">
                              {pendingBalance > 0 ? "(Dr)" : "(Cr)"}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                            Amount in Words
                          </p>
                          <p className="text-sm font-semibold text-gray-700 mt-0.5 max-w-xs sm:text-right">
                            {numberToWords(Math.abs(pendingBalance))}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-300 px-5 py-3 flex justify-between text-xs text-gray-400">
                      <span>Generated by Third Eye Home</span>
                      <span>{new Date().toLocaleString("en-IN")}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {!selectedId && (
              <div className="bg-card rounded-xl border border-border shadow-card p-12 text-center text-sm text-muted-foreground">
                Select a flat owner above to view their account statement.
              </div>
            )}
          </>
        )}

        {/* ======================== SOCIETY STATEMENT TAB ======================== */}
        {activeTab === "society" && (
          <>
            {/* Controls bar */}
            <div className="bg-card rounded-xl border border-border shadow-card p-5 no-print">
              <div className="flex flex-wrap gap-2 items-center mb-3">
                <span className="text-xs text-muted-foreground font-semibold mr-1">
                  Duration:
                </span>
                {(
                  ["all", "last-month", "last-365", "custom"] as FilterPreset[]
                ).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSocFilter(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      socFilter === p
                        ? "bg-primary text-white shadow"
                        : "border border-border bg-muted text-foreground hover:bg-muted/70"
                    }`}
                  >
                    {p === "all"
                      ? "All Time"
                      : p === "last-month"
                        ? "Last Month"
                        : p === "last-365"
                          ? "Last 365 Days"
                          : "Custom Range"}
                  </button>
                ))}
              </div>
              {socFilter === "custom" && (
                <div className="flex flex-wrap gap-3 items-center mb-3">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="soc-from"
                      className="text-xs text-muted-foreground"
                    >
                      From:
                    </label>
                    <input
                      id="soc-from"
                      type="date"
                      value={socDateFrom}
                      onChange={(e) => setSocDateFrom(e.target.value)}
                      className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="soc-to"
                      className="text-xs text-muted-foreground"
                    >
                      To:
                    </label>
                    <input
                      id="soc-to"
                      type="date"
                      value={socDateTo}
                      onChange={(e) => setSocDateTo(e.target.value)}
                      className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    Society Overall Statement
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Consolidated Tally-style statement for all flat owners
                  </p>
                </div>
                <div className="flex gap-2 ml-auto flex-wrap">
                  <Button
                    data-ocid="society.generate.button"
                    onClick={loadSocietyStatement}
                    disabled={loadingSociety}
                    className="bg-primary text-white h-9 text-sm"
                  >
                    {loadingSociety ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <FileText className="w-4 h-4 mr-1" />
                    )}
                    Generate Statement
                  </Button>
                  {societyLoaded && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleSocietyPrint}
                        className="h-9 text-sm gap-2"
                        data-ocid="society.print.button"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleSocietyPDF}
                        className="h-9 text-sm gap-2"
                        data-ocid="society.pdf.button"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Society statement document */}
            {!societyLoaded && !loadingSociety && (
              <div
                className="bg-card rounded-xl border border-border shadow-card p-12 text-center text-sm text-muted-foreground"
                data-ocid="society.empty_state"
              >
                Click "Generate Statement" to load the overall society
                statement.
              </div>
            )}

            {loadingSociety && (
              <div
                className="bg-card rounded-xl border border-border p-12 text-center"
                data-ocid="society.loading_state"
              >
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Loading society statement…
                </p>
              </div>
            )}

            {societyLoaded && !loadingSociety && (
              <div
                id="society-statement"
                className="bg-white border border-gray-300 rounded-xl overflow-hidden"
              >
                {/* Society Statement Header */}
                <div className="border-b-2 border-gray-800 p-6 text-center bg-gray-900 text-white">
                  <h1 className="text-2xl font-bold uppercase tracking-widest">
                    THIRD EYE HOME
                  </h1>
                  <p className="text-sm font-semibold mt-1 text-gray-300">
                    Society Overall Maintenance Statement
                  </p>
                  <div className="flex justify-center gap-8 mt-3 text-xs text-gray-400">
                    <span>
                      Print Date:{" "}
                      <strong className="text-white">{printDate}</strong>
                    </span>
                    <span>
                      Period:{" "}
                      <strong className="text-white">
                        {socFilter === "all" && "All Time"}
                        {socFilter === "last-month" && "Last 30 Days"}
                        {socFilter === "last-365" && "Last 365 Days"}
                        {socFilter === "custom" &&
                          `${socDateFrom || "—"} to ${socDateTo || "—"}`}
                      </strong>
                    </span>
                    <span>
                      Total Flats:{" "}
                      <strong className="text-white">
                        {societyOwners.length}
                      </strong>
                    </span>
                    <span>
                      Flats with Dues:{" "}
                      <strong className="text-yellow-400">
                        {flatsWithDues}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Per-owner sections */}
                {societyOwners.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No flat owners found.
                  </div>
                ) : (
                  <div>
                    {societyData.map(
                      (
                        {
                          owner,
                          ownerRows,
                          ownerDebit,
                          ownerCredit,
                          ownerBalance,
                        },
                        ownerIdx,
                      ) => (
                        <div
                          key={owner.id.toString()}
                          className="border-b border-gray-300"
                          data-ocid={`society.item.${ownerIdx + 1}`}
                        >
                          {/* Owner section header */}
                          <div className="bg-gray-700 text-white px-4 py-2 flex flex-wrap gap-4 text-sm font-semibold">
                            <span>
                              Flat: {owner.blockNo}-{owner.flatNo}
                            </span>
                            <span>|</span>
                            <span>Owner: {owner.ownerName}</span>
                            <span>|</span>
                            <span>Phone: {owner.phone || "—"}</span>
                            <span className="ml-auto">
                              Balance:{" "}
                              <span
                                className={
                                  ownerBalance > 0
                                    ? "text-red-300"
                                    : "text-green-300"
                                }
                              >
                                {formatINR(Math.abs(ownerBalance))}{" "}
                                {ownerBalance > 0
                                  ? "Dr"
                                  : ownerBalance < 0
                                    ? "Cr"
                                    : "Nil"}
                              </span>
                            </span>
                          </div>

                          {/* Owner transactions table */}
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                              <thead>
                                <tr className="bg-gray-100 text-gray-700">
                                  <th className="border border-gray-200 px-2 py-1.5 text-left w-8">
                                    #
                                  </th>
                                  <th className="border border-gray-200 px-2 py-1.5 text-left">
                                    Date
                                  </th>
                                  <th className="border border-gray-200 px-2 py-1.5 text-left">
                                    Particulars / Description
                                  </th>
                                  <th className="border border-gray-200 px-2 py-1.5 text-left">
                                    Vch Type
                                  </th>
                                  <th className="border border-gray-200 px-2 py-1.5 text-right">
                                    Debit (₹)
                                  </th>
                                  <th className="border border-gray-200 px-2 py-1.5 text-right">
                                    Credit (₹)
                                  </th>
                                  <th className="border border-gray-200 px-2 py-1.5 text-right">
                                    Balance Due (₹)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Opening balance row */}
                                <tr className="bg-blue-50">
                                  <td className="border border-gray-200 px-2 py-1.5 text-gray-400">
                                    —
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1.5 text-gray-500">
                                    —
                                  </td>
                                  <td
                                    className="border border-gray-200 px-2 py-1.5 font-semibold text-blue-700"
                                    colSpan={2}
                                  >
                                    Opening Balance
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1.5 text-right text-gray-400">
                                    —
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1.5 text-right text-gray-400">
                                    —
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1.5 text-right font-semibold text-blue-700">
                                    0.00
                                  </td>
                                </tr>

                                {ownerRows.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="border border-gray-200 px-2 py-3 text-center text-gray-400 italic"
                                    >
                                      No transactions
                                    </td>
                                  </tr>
                                ) : (
                                  ownerRows.map((t, i) => {
                                    const isDebit =
                                      t.transactionType ===
                                      TransactionType.Debit;
                                    const rowBg =
                                      i % 2 === 0 ? "bg-white" : "bg-gray-50";
                                    return (
                                      <tr
                                        key={t.id.toString()}
                                        className={rowBg}
                                      >
                                        <td className="border border-gray-200 px-2 py-1.5 text-gray-400">
                                          {i + 1}
                                        </td>
                                        <td className="border border-gray-200 px-2 py-1.5 text-gray-600 whitespace-nowrap">
                                          {formatDate(t.entryDate)}
                                        </td>
                                        <td className="border border-gray-200 px-2 py-1.5">
                                          {t.description}
                                        </td>
                                        <td className="border border-gray-200 px-2 py-1.5">
                                          <span
                                            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                              isDebit
                                                ? "bg-red-100 text-red-700"
                                                : "bg-green-100 text-green-700"
                                            }`}
                                          >
                                            {isDebit ? "Debit Note" : "Receipt"}
                                          </span>
                                        </td>
                                        <td className="border border-gray-200 px-2 py-1.5 text-right font-mono">
                                          {isDebit ? (
                                            <span className="text-red-600">
                                              {Number(t.amount).toLocaleString(
                                                "en-IN",
                                              )}
                                            </span>
                                          ) : (
                                            <span className="text-gray-300">
                                              —
                                            </span>
                                          )}
                                        </td>
                                        <td className="border border-gray-200 px-2 py-1.5 text-right font-mono">
                                          {!isDebit ? (
                                            <span className="text-green-600">
                                              {Number(t.amount).toLocaleString(
                                                "en-IN",
                                              )}
                                            </span>
                                          ) : (
                                            <span className="text-gray-300">
                                              —
                                            </span>
                                          )}
                                        </td>
                                        <td className="border border-gray-200 px-2 py-1.5 text-right font-mono">
                                          <span
                                            className={
                                              t.runningBalance > 0
                                                ? "text-red-600 font-semibold"
                                                : "text-green-600 font-semibold"
                                            }
                                          >
                                            {t.runningBalance.toLocaleString(
                                              "en-IN",
                                            )}
                                            {t.runningBalance > 0
                                              ? " Dr"
                                              : " Cr"}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}

                                {/* Owner totals row */}
                                <tr className="bg-gray-100 font-bold text-xs">
                                  <td
                                    colSpan={4}
                                    className="border border-gray-300 px-2 py-1.5 text-right text-gray-700 uppercase tracking-wide"
                                  >
                                    Totals
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-red-700">
                                    {ownerDebit.toLocaleString("en-IN")}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-green-700">
                                    {ownerCredit.toLocaleString("en-IN")}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1.5 text-right font-mono">
                                    <span
                                      className={
                                        ownerBalance > 0
                                          ? "text-red-700"
                                          : "text-green-700"
                                      }
                                    >
                                      {Math.abs(ownerBalance).toLocaleString(
                                        "en-IN",
                                      )}
                                      {ownerBalance > 0 ? " Dr" : " Cr"}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Closing balance in words per owner */}
                          <div className="bg-gray-50 px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                            <span className="text-gray-500">
                              Closing Balance:
                              <strong
                                className={`ml-2 ${ownerBalance > 0 ? "text-red-600" : "text-green-600"}`}
                              >
                                {formatINR(Math.abs(ownerBalance))}{" "}
                                {ownerBalance > 0 ? "(Dr)" : "(Cr)"}
                              </strong>
                            </span>
                            <span className="text-gray-600 italic">
                              {numberToWords(Math.abs(ownerBalance))}{" "}
                              {ownerBalance > 0 ? "(Dr)" : "(Cr)"}
                            </span>
                          </div>
                        </div>
                      ),
                    )}

                    {/* Grand Totals */}
                    <div className="bg-gray-900 text-white p-5">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-300 mb-3">
                        Grand Totals — All Flats
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="text-gray-400 text-xs uppercase">
                              <th className="border border-gray-700 px-3 py-2 text-left">
                                Description
                              </th>
                              <th className="border border-gray-700 px-3 py-2 text-right">
                                Total Debit (₹)
                              </th>
                              <th className="border border-gray-700 px-3 py-2 text-right">
                                Total Credit (₹)
                              </th>
                              <th className="border border-gray-700 px-3 py-2 text-right">
                                Net Balance Due (₹)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="font-bold">
                              <td className="border border-gray-700 px-3 py-2">
                                All Flat Owners Combined
                              </td>
                              <td className="border border-gray-700 px-3 py-2 text-right font-mono text-red-400">
                                {grandDebit.toLocaleString("en-IN")}
                              </td>
                              <td className="border border-gray-700 px-3 py-2 text-right font-mono text-green-400">
                                {grandCredit.toLocaleString("en-IN")}
                              </td>
                              <td className="border border-gray-700 px-3 py-2 text-right font-mono">
                                <span
                                  className={
                                    grandBalance > 0
                                      ? "text-red-400"
                                      : "text-green-400"
                                  }
                                >
                                  {Math.abs(grandBalance).toLocaleString(
                                    "en-IN",
                                  )}
                                  {grandBalance > 0 ? " Dr" : " Cr"}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">
                            Overall Balance Due in Words
                          </p>
                          <p className="text-sm font-semibold text-yellow-300 mt-1">
                            {numberToWords(Math.abs(grandBalance))}{" "}
                            {grandBalance > 0 ? "(Dr)" : "(Cr)"}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-xs text-gray-400 uppercase tracking-wide">
                            Flats with Pending Dues
                          </p>
                          <p className="text-2xl font-bold text-yellow-400 mt-1">
                            {flatsWithDues}
                            <span className="text-sm font-normal text-gray-400 ml-2">
                              / {societyOwners.length} flats
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Society Statement Footer */}
                <div className="border-t border-gray-300 px-5 py-3 flex justify-between text-xs text-gray-400 bg-gray-50">
                  <span>Generated by Third Eye Home</span>
                  <span>Date: {new Date().toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add Manual Entry Modal */}
        <Dialog
          open={showModal}
          onOpenChange={(o) => {
            if (!o) {
              setShowModal(false);
              setSelectedCategory("");
            }
          }}
        >
          <DialogContent
            data-ocid="accounts.add.dialog"
            className="max-w-sm no-print"
          >
            <DialogHeader>
              <DialogTitle>Add Manual Transaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Transaction Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => {
                    setForm((p) => ({
                      ...p,
                      type: v as TransactionType,
                      description: "",
                    }));
                    setSelectedCategory("");
                  }}
                >
                  <SelectTrigger
                    data-ocid="accounts.type.select"
                    className="mt-1 h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TransactionType.Debit}>Debit</SelectItem>
                    <SelectItem value={TransactionType.Credit}>
                      Credit
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(() => {
                const cats =
                  form.type === TransactionType.Debit
                    ? loadCategories(
                        "expenseCategories",
                        DEFAULT_EXPENSE_CATEGORIES,
                      )
                    : loadCategories(
                        "paymentCategories",
                        DEFAULT_PAYMENT_CATEGORIES,
                      );
                return cats.length > 0 ? (
                  <div>
                    <Label className="text-xs">Category (optional)</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(v) => {
                        setSelectedCategory(v);
                        if (v) setForm((p) => ({ ...p, description: v }));
                      }}
                    >
                      <SelectTrigger
                        data-ocid="accounts.category.select"
                        className="mt-1 h-9 text-sm"
                      >
                        <SelectValue placeholder="-- Select a category --" />
                      </SelectTrigger>
                      <SelectContent>
                        {cats.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null;
              })()}
              <div>
                <Label className="text-xs">Description</Label>
                <Input
                  data-ocid="accounts.description.input"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Maintenance charge / Payment received"
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  data-ocid="accounts.amount.input"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  placeholder="2500"
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Month-Year (MM-YYYY)</Label>
                <Input
                  data-ocid="accounts.month.input"
                  value={form.monthYear}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, monthYear: e.target.value }))
                  }
                  placeholder="03-2026"
                  className="mt-1 h-9 font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                data-ocid="accounts.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEntry}
                disabled={saving}
                className="bg-primary text-white"
                data-ocid="accounts.submit_button"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Add Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Entry Modal */}
        <Dialog
          open={showEditModal}
          onOpenChange={(o) => !o && setShowEditModal(false)}
        >
          <DialogContent
            data-ocid="accounts.edit.dialog"
            className="max-w-sm no-print"
          >
            <DialogHeader>
              <DialogTitle>Edit Last Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Transaction Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(v) =>
                    setEditForm((p) => ({ ...p, type: v as TransactionType }))
                  }
                >
                  <SelectTrigger
                    data-ocid="accounts.edit_type.select"
                    className="mt-1 h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TransactionType.Debit}>Debit</SelectItem>
                    <SelectItem value={TransactionType.Credit}>
                      Credit
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input
                  data-ocid="accounts.edit_description.input"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Maintenance charge / Payment received"
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  data-ocid="accounts.edit_amount.input"
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  placeholder="2500"
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Month-Year (MM-YYYY)</Label>
                <Input
                  data-ocid="accounts.edit_month.input"
                  value={editForm.monthYear}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, monthYear: e.target.value }))
                  }
                  placeholder="03-2026"
                  className="mt-1 h-9 font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                data-ocid="accounts.edit_cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSave}
                disabled={editSaving}
                className="bg-primary text-white"
                data-ocid="accounts.edit_save_button"
              >
                {editSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={(o) => !o && setShowDeleteConfirm(false)}
        >
          <AlertDialogContent
            data-ocid="accounts.delete.dialog"
            className="no-print"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Last Entry?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this entry? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                data-ocid="accounts.delete_cancel_button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTransactionId(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                data-ocid="accounts.delete_confirm_button"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Delete Entry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ======================== EXPENSE ENTRY TAB ======================== */}
        {activeTab === "expense" && (
          <div className="space-y-4 no-print">
            {/* Header */}
            <div className="bg-card rounded-xl border border-border shadow-card p-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Expense Vouchers
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Record society expenses — salary, repairs, utilities &amp;
                  more
                </p>
              </div>
              <Button
                data-ocid="expense.open_modal_button"
                onClick={() => {
                  setExpenseForm({
                    date: new Date().toISOString().split("T")[0],
                    category: "",
                    description: "",
                    amount: "",
                    payee: "",
                    remarks: "",
                  });
                  setShowExpenseModal(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Expense Entry
              </Button>
            </div>

            {/* Voucher table */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              {loadingExpense ? (
                <div
                  data-ocid="expense.loading_state"
                  className="flex items-center justify-center p-10 gap-2 text-muted-foreground"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading vouchers…
                </div>
              ) : expenseVouchers.length === 0 ? (
                <div
                  data-ocid="expense.empty_state"
                  className="flex flex-col items-center justify-center p-12 text-center"
                >
                  <Receipt className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground font-medium">
                    No expense vouchers yet
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Click &quot;New Expense Entry&quot; to create the first
                    voucher
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                          Voucher No
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                          Date
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                          Category
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                          Description
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                          Payee
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                          Amount
                        </th>
                        <th className="text-center px-4 py-3 font-semibold text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseVouchers.map((v, idx) => (
                        <tr
                          key={String(v.id)}
                          data-ocid={`expense.item.${idx + 1}`}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                            {v.voucherNo}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {v.date}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">
                              {v.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {v.description}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {v.payee || "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                            {formatINR(Number(v.amount))}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                data-ocid={`expense.print.${idx + 1}`}
                                title="Print Voucher"
                                className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors"
                                onClick={() => {
                                  setPrintVoucher(v);
                                  setTimeout(() => window.print(), 100);
                                }}
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                data-ocid={`expense.delete_button.${idx + 1}`}
                                title="Delete Voucher"
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                                onClick={() => {
                                  setDeleteExpenseId(v.id);
                                  setShowExpenseDeleteConfirm(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/40 border-t-2 border-border font-bold">
                        <td colSpan={5} className="px-4 py-3 text-foreground">
                          Total Expenses
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                          {formatINR(
                            expenseVouchers.reduce(
                              (s, v) => s + Number(v.amount),
                              0,
                            ),
                          )}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden print div for expense voucher */}
        <div
          id="expense-voucher-print"
          ref={expensePrintRef}
          style={{ display: "none" }}
        >
          {printVoucher && (
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                padding: "40px",
                maxWidth: "700px",
                margin: "0 auto",
                border: "2px solid #000",
              }}
            >
              {/* Header */}
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "2px solid #000",
                  paddingBottom: "12px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "bold",
                    letterSpacing: "1px",
                  }}
                >
                  THIRD EYE HOME SOCIETY
                </div>
                <div
                  style={{ fontSize: "14px", color: "#444", marginTop: "4px" }}
                >
                  Residential Society Management
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginTop: "8px",
                    textDecoration: "underline",
                    letterSpacing: "2px",
                  }}
                >
                  EXPENSE VOUCHER
                </div>
              </div>

              {/* Voucher meta */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <span style={{ fontWeight: "bold" }}>Voucher No: </span>
                  <span style={{ fontFamily: "monospace" }}>
                    {printVoucher.voucherNo}
                  </span>
                </div>
                <div>
                  <span style={{ fontWeight: "bold" }}>Date: </span>
                  {printVoucher.date}
                </div>
              </div>

              {/* Category */}
              <div
                style={{
                  marginBottom: "12px",
                  padding: "8px 12px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "#f9f9f9",
                }}
              >
                <span style={{ fontWeight: "bold" }}>
                  Category / Account Head:{" "}
                </span>
                <span style={{ fontSize: "15px" }}>
                  {printVoucher.category}
                </span>
              </div>

              {/* Payee */}
              {printVoucher.payee && (
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ fontWeight: "bold" }}>Payee / Paid To: </span>
                  {printVoucher.payee}
                </div>
              )}

              {/* Description */}
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontWeight: "bold" }}>
                  Description / Narration:{" "}
                </span>
                {printVoucher.description}
              </div>

              {/* Amount box */}
              <div
                style={{
                  border: "2px solid #000",
                  padding: "12px 16px",
                  marginBottom: "12px",
                  borderRadius: "4px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: "bold", fontSize: "15px" }}>
                    Amount (₹):
                  </span>
                  <span style={{ fontSize: "20px", fontWeight: "bold" }}>
                    {formatINR(Number(printVoucher.amount))}
                  </span>
                </div>
                <div
                  style={{ marginTop: "6px", fontSize: "13px", color: "#555" }}
                >
                  <span style={{ fontWeight: "bold" }}>In Words: </span>
                  {numberToWords(Number(printVoucher.amount))} Only
                </div>
              </div>

              {/* Remarks */}
              {printVoucher.remarks && (
                <div style={{ marginBottom: "16px" }}>
                  <span style={{ fontWeight: "bold" }}>Remarks: </span>
                  {printVoucher.remarks}
                </div>
              )}

              {/* Debit note */}
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "20px",
                  padding: "6px 10px",
                  border: "1px dashed #aaa",
                  borderRadius: "3px",
                }}
              >
                Debit Entry — Charged against Maintenance Revenue Account
              </div>

              {/* Footer signature */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "40px",
                  borderTop: "1px solid #ccc",
                  paddingTop: "16px",
                }}
              >
                <div style={{ textAlign: "center", minWidth: "180px" }}>
                  <div
                    style={{
                      borderTop: "1px solid #000",
                      marginTop: "40px",
                      paddingTop: "6px",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    Prepared By
                  </div>
                  <div style={{ fontSize: "12px", color: "#555" }}>
                    Admin / Accounts
                  </div>
                </div>
                <div style={{ textAlign: "center", minWidth: "180px" }}>
                  <div
                    style={{
                      borderTop: "1px solid #000",
                      marginTop: "40px",
                      paddingTop: "6px",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    Authorized Signatory
                  </div>
                  <div style={{ fontSize: "12px", color: "#555" }}>
                    Society Chairman / Secretary
                  </div>
                </div>
              </div>

              {/* Print footer */}
              <div
                style={{
                  textAlign: "center",
                  marginTop: "24px",
                  fontSize: "11px",
                  color: "#888",
                  borderTop: "1px solid #eee",
                  paddingTop: "8px",
                }}
              >
                This is a computer-generated voucher. Third Eye Home Society.
              </div>
            </div>
          )}
        </div>

        {/* ======================== EXPENSE ENTRY FORM MODAL ======================== */}
        <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
          <DialogContent className="max-w-lg" data-ocid="expense.dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                New Expense Voucher
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1 block">Voucher No</Label>
                  <Input
                    value={`EXP-${new Date().getFullYear()}-${String(expenseVouchers.length + 1).padStart(4, "0")}`}
                    disabled
                    className="bg-muted text-muted-foreground font-mono text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Date</Label>
                  <Input
                    data-ocid="expense.input"
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) =>
                      setExpenseForm((p) => ({ ...p, date: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">
                  Category (Debit Account Head)
                </Label>
                <select
                  data-ocid="expense.select"
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select expense category…</option>
                  {loadCategories(
                    "expenseCategories",
                    DEFAULT_EXPENSE_CATEGORIES,
                  ).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">
                  Description / Narration
                </Label>
                <Input
                  data-ocid="expense.textarea"
                  placeholder="e.g. Salary for March 2026"
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1 block">Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm((p) => ({ ...p, amount: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">
                    Payee / Paid To (optional)
                  </Label>
                  <Input
                    placeholder="e.g. Ramesh Kumar"
                    value={expenseForm.payee}
                    onChange={(e) =>
                      setExpenseForm((p) => ({ ...p, payee: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Remarks (optional)</Label>
                <textarea
                  placeholder="Any additional notes…"
                  value={expenseForm.remarks}
                  onChange={(e) =>
                    setExpenseForm((p) => ({ ...p, remarks: e.target.value }))
                  }
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                data-ocid="expense.cancel_button"
                onClick={() => setShowExpenseModal(false)}
              >
                Cancel
              </Button>
              <Button
                data-ocid="expense.submit_button"
                disabled={
                  expenseSaving ||
                  !expenseForm.category ||
                  !expenseForm.description ||
                  !expenseForm.amount
                }
                onClick={async () => {
                  if (!actor) return;
                  setExpenseSaving(true);
                  const voucherNo = `EXP-${new Date().getFullYear()}-${String(expenseVouchers.length + 1).padStart(4, "0")}`;
                  try {
                    await actor.addExpenseVoucher(
                      voucherNo,
                      expenseForm.date,
                      expenseForm.category,
                      expenseForm.description,
                      BigInt(Math.round(Number(expenseForm.amount))),
                      expenseForm.payee,
                      expenseForm.remarks,
                    );
                    toast.success("Expense voucher saved");
                    setShowExpenseModal(false);
                    const updated = await actor.getAllExpenseVouchers();
                    setExpenseVouchers(
                      [...updated].sort(
                        (a, b) => Number(b.entryDate) - Number(a.entryDate),
                      ),
                    );
                  } catch {
                    toast.error("Failed to save expense voucher");
                  } finally {
                    setExpenseSaving(false);
                  }
                }}
              >
                {expenseSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Save Voucher
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expense delete confirmation */}
        <AlertDialog
          open={showExpenseDeleteConfirm}
          onOpenChange={setShowExpenseDeleteConfirm}
        >
          <AlertDialogContent data-ocid="expense.dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Expense Voucher?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this expense voucher. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                data-ocid="expense.cancel_button"
                onClick={() => {
                  setShowExpenseDeleteConfirm(false);
                  setDeleteExpenseId(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                data-ocid="expense.confirm_button"
                disabled={deletingExpense}
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  if (!actor || deleteExpenseId === null) return;
                  setDeletingExpense(true);
                  try {
                    await actor.deleteExpenseVoucher(deleteExpenseId);
                    toast.success("Voucher deleted");
                    setExpenseVouchers((prev) =>
                      prev.filter((v) => v.id !== deleteExpenseId),
                    );
                  } catch {
                    toast.error("Failed to delete voucher");
                  } finally {
                    setDeletingExpense(false);
                    setShowExpenseDeleteConfirm(false);
                    setDeleteExpenseId(null);
                  }
                }}
              >
                {deletingExpense ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ======================== RECEIPTS TAB ======================== */}
        {activeTab === "receipts" && (
          <div className="space-y-4 no-print">
            {/* Summary */}
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Payment Receipts</h2>
                  <p className="text-xs text-muted-foreground">
                    All payment (credit) receipts across the society
                  </p>
                </div>
              </div>
              {!loadingReceipts &&
                receiptsTransactions.filter(
                  (t) => t.transactionType === TransactionType.Credit,
                ).length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">
                        Total Payments Received:{" "}
                      </span>
                      {formatINR(
                        receiptsTransactions
                          .filter(
                            (t) => t.transactionType === TransactionType.Credit,
                          )
                          .reduce((s, t) => s + Number(t.amount), 0),
                      )}
                      <span className="ml-2 text-xs text-green-600">
                        (
                        {
                          receiptsTransactions.filter(
                            (t) => t.transactionType === TransactionType.Credit,
                          ).length
                        }{" "}
                        receipts)
                      </span>
                    </p>
                  </div>
                )}
            </div>

            {loadingReceipts ? (
              <div
                data-ocid="receipts.loading_state"
                className="bg-card rounded-xl border border-border p-12 text-center"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Loading receipts...
                </p>
              </div>
            ) : receiptsTransactions.filter(
                (t) => t.transactionType === TransactionType.Credit,
              ).length === 0 ? (
              <div
                data-ocid="receipts.empty_state"
                className="bg-card rounded-xl border border-border shadow-card p-12 text-center"
              >
                <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">
                  No payment receipts found.
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="px-4 py-3 text-left font-semibold">
                          Receipt No
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Flat No
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Block
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Owner Name
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Description
                        </th>
                        <th className="px-4 py-3 text-center font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...receiptsTransactions]
                        .filter(
                          (t) => t.transactionType === TransactionType.Credit,
                        )
                        .sort(
                          (a, b) => Number(b.entryDate) - Number(a.entryDate),
                        )
                        .map((t, i) => {
                          const owner = receiptsOwners.find(
                            (o) => o.id.toString() === t.flatOwnerId.toString(),
                          );
                          const receiptNo = `RCP-${String(Number(t.id)).padStart(5, "0")}`;
                          const amountNum = Number(t.amount);
                          const openReceiptWin = () => {
                            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt ${receiptNo}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#fff;color:#111}.receipt{max-width:600px;margin:0 auto;border:2px solid #1a1a2e;border-radius:8px;overflow:hidden}.header{background:#1a1a2e;color:white;padding:20px 24px;text-align:center}.header h1{margin:0;font-size:22px;letter-spacing:2px}.header p{margin:4px 0 0;font-size:13px;color:#aaa}.receipt-no{background:#f5f5f5;border-bottom:1px solid #ddd;padding:10px 24px;display:flex;justify-content:space-between;font-size:13px}.body{padding:20px 24px}.section{margin-bottom:16px}.section label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px}.section .value{font-size:14px;font-weight:600;color:#111;margin-top:2px}.amount-box{background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:16px 20px;text-align:center;margin:20px 0}.amount-box .amt{font-size:32px;font-weight:800;color:#16a34a}.amount-box .words{font-size:13px;color:#444;margin-top:4px;font-style:italic}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.thanks{text-align:center;padding:16px;background:#fafafa;border-top:1px solid #eee;font-size:13px;color:#555}.sig{display:flex;justify-content:flex-end;padding:16px 24px 20px}.sig-box{text-align:center}.sig-line{border-top:1px solid #333;width:180px;margin:0 auto 4px}.sig-label{font-size:11px;color:#666}@media print{body{padding:0}}</style></head><body><div class="receipt"><div class="header"><h1>THIRD EYE HOME</h1><p>Payment Receipt</p></div><div class="receipt-no"><span><strong>Receipt No:</strong> ${receiptNo}</span><span><strong>Date:</strong> ${formatDate(t.entryDate)}</span></div><div class="body"><div class="section"><label>Flat Details</label><div class="grid2"><div class="value">Flat: ${owner ? `${owner.blockNo}-${owner.flatNo}` : "—"}</div><div class="value">Owner: ${owner?.ownerName ?? "—"}</div></div></div><div class="amount-box"><div class="amt">&#8377;${amountNum.toLocaleString("en-IN")}</div><div class="words">${numberToWords(amountNum)} Only</div></div><div class="section"><label>Description / Payment Category</label><div class="value">${t.description}</div></div></div><div class="thanks">Received with thanks</div><div class="sig"><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Authorized Signatory</div></div></div></div><script>window.onload=function(){window.print();}<\/script></body></html>`;
                            const w = window.open(
                              "",
                              "_blank",
                              "width=700,height=600",
                            );
                            if (w) {
                              w.document.write(html);
                              w.document.close();
                            }
                          };
                          return (
                            <tr
                              key={t.id.toString()}
                              className={
                                i % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                              data-ocid={`receipts.item.${i + 1}`}
                            >
                              <td className="px-4 py-2.5 font-mono text-xs font-semibold text-green-700">
                                {receiptNo}
                              </td>
                              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                                {formatDate(t.entryDate)}
                              </td>
                              <td className="px-4 py-2.5 font-medium">
                                {owner?.flatNo ?? "—"}
                              </td>
                              <td className="px-4 py-2.5">
                                {owner?.blockNo ?? "—"}
                              </td>
                              <td className="px-4 py-2.5">
                                {owner?.ownerName ?? "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-semibold text-green-700">
                                {formatINR(amountNum)}
                              </td>
                              <td className="px-4 py-2.5 text-gray-600">
                                {t.description}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={openReceiptWin}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                                    data-ocid={`receipts.print.${i + 1}`}
                                  >
                                    <Printer className="w-3 h-3" />
                                    Print
                                  </button>
                                  <button
                                    type="button"
                                    onClick={openReceiptWin}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                                    data-ocid={`receipts.download.${i + 1}`}
                                  >
                                    <Download className="w-3 h-3" />
                                    PDF
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
