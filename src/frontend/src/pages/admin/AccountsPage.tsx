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
import { Download, Loader2, Plus, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  FlatOwnerPublic as FlatOwner,
  Transaction,
} from "../../backend.d";
import { TransactionType } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import { formatDate, formatINR, getCurrentMonthYear } from "../../utils/format";
import { numberToWords } from "../../utils/numberToWords";

export default function AccountsPage() {
  const { actor, isFetching } = useActor();
  const [owners, setOwners] = useState<FlatOwner[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [statement, setStatement] = useState<Transaction[]>([]);
  const [loadingStmt, setLoadingStmt] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: TransactionType.Debit,
    description: "",
    amount: "",
    monthYear: getCurrentMonthYear(),
  });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actor || isFetching) return;
    actor
      .getAllFlatOwners()
      .then(setOwners)
      .catch(() => null);
  }, [actor, isFetching]);

  useEffect(() => {
    if (!actor || !selectedId) return;
    setLoadingStmt(true);
    actor
      .getFlatStatement(BigInt(selectedId))
      .then(setStatement)
      .catch(() => toast.error("Failed to load statement"))
      .finally(() => setLoadingStmt(false));
  }, [actor, selectedId]);

  // Compute running balance rows
  const rows = statement.map((t, i) => {
    const runningBalance = statement.slice(0, i + 1).reduce((acc, tx) => {
      return tx.transactionType === TransactionType.Debit
        ? acc + Number(tx.amount)
        : acc - Number(tx.amount);
    }, 0);
    return { ...t, runningBalance };
  });

  const pendingBalance =
    rows.length > 0 ? rows[rows.length - 1].runningBalance : 0;
  const totalDebit = statement
    .filter((t) => t.transactionType === TransactionType.Debit)
    .reduce((a, t) => a + Number(t.amount), 0);
  const totalCredit = statement
    .filter((t) => t.transactionType === TransactionType.Credit)
    .reduce((a, t) => a + Number(t.amount), 0);

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
      const updated = await actor.getFlatStatement(BigInt(selectedId));
      setStatement(updated);
    } catch (e: any) {
      toast.error(e?.message || "Failed to add entry");
    } finally {
      setSaving(false);
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

  const selectedOwner = owners.find((o) => o.id.toString() === selectedId);
  const balanceClass = pendingBalance > 0 ? "text-red-600" : "text-green-600";

  return (
    <>
      {/* Print-only global style */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #tally-statement, #tally-statement * { visibility: visible !important; }
          #tally-statement { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-5">
        {/* Flat selector */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5 no-print">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <Label className="text-xs mb-1 block">Select Flat Owner</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger
                  data-ocid="accounts.owner.select"
                  className="h-9"
                >
                  <SelectValue placeholder="Choose a flat owner…" />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.id.toString()} value={o.id.toString()}>
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
                    onClick={() => setShowModal(true)}
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
                  <span className="font-semibold">
                    {new Date().toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
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
                {/* Tally-style Table */}
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
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((t, i) => {
                        const isDebit =
                          t.transactionType === TransactionType.Debit;
                        const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
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
                          </tr>
                        );
                      })}

                      {/* Totals row */}
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
                            {Math.abs(pendingBalance).toLocaleString("en-IN")}
                            {pendingBalance > 0 ? " Dr" : " Cr"}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Balance in words */}
                <div className="border-t border-gray-300 bg-gray-50 px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                        Closing Balance Due
                      </p>
                      <p
                        className="text-2xl font-bold mt-0.5 {balanceClass}"
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

                {/* Footer */}
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

        {/* Add Manual Entry Modal */}
        <Dialog
          open={showModal}
          onOpenChange={(o) => !o && setShowModal(false)}
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
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, type: v as TransactionType }))
                  }
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
      </div>
    </>
  );
}
