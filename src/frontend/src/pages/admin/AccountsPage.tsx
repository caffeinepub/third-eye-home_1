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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  FlatOwnerPublic as FlatOwner,
  Transaction,
} from "../../backend.d";
import { TransactionType } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import { formatDate, formatINR, getCurrentMonthYear } from "../../utils/format";

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

  const pendingBalance = statement.reduce((acc, t) => {
    return t.transactionType === TransactionType.Debit
      ? acc + Number(t.amount)
      : acc - Number(t.amount);
  }, 0);

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

  const selectedOwner = owners.find((o) => o.id.toString() === selectedId);
  const balanceClass =
    pendingBalance > 0 ? "text-destructive" : "text-[oklch(0.55_0.15_150)]";
  const spanClass =
    pendingBalance > 0
      ? "bg-[oklch(0.96_0.03_25)] text-destructive"
      : "bg-[oklch(0.95_0.04_150)] text-[oklch(0.45_0.15_150)]";

  return (
    <div className="space-y-5">
      {/* Flat selector */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <Label className="text-xs mb-1 block">Select Flat Owner</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger data-ocid="accounts.owner.select" className="h-9">
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
                <p className="text-xs text-muted-foreground">Pending Balance</p>
                <p className={`text-lg font-bold ${balanceClass}`}>
                  {formatINR(pendingBalance)}
                </p>
              </div>
              <Button
                data-ocid="accounts.add.button"
                onClick={() => setShowModal(true)}
                className="bg-primary text-white h-9 text-sm ml-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Manual Entry
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Statement table */}
      {selectedId && (
        <div className="bg-card rounded-xl border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Statement —{" "}
              {selectedOwner
                ? `${selectedOwner.blockNo}-${selectedOwner.flatNo} (${selectedOwner.ownerName})`
                : ""}
            </h2>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${spanClass}`}
            >
              {pendingBalance > 0
                ? `Due: ${formatINR(pendingBalance)}`
                : "Cleared"}
            </span>
          </div>
          {loadingStmt ? (
            <div data-ocid="accounts.loading_state" className="p-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
            </div>
          ) : statement.length === 0 ? (
            <div
              data-ocid="accounts.empty_state"
              className="p-8 text-center text-sm text-muted-foreground"
            >
              No transactions found for this flat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[oklch(0.96_0.005_245)]">
                    <TableHead className="text-xs font-semibold">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Description
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Type
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-semibold">By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.map((t, i) => {
                    const isDebit = t.transactionType === TransactionType.Debit;
                    const typeClass = isDebit
                      ? "text-destructive"
                      : "text-[oklch(0.55_0.15_150)]";
                    return (
                      <TableRow
                        key={t.id.toString()}
                        data-ocid={`accounts.item.${i + 1}`}
                        className="text-sm"
                      >
                        <TableCell className="text-muted-foreground">
                          {formatDate(t.entryDate)}
                        </TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${typeClass}`}>
                            {t.transactionType}
                          </span>
                        </TableCell>
                        <TableCell className={`font-medium ${typeClass}`}>
                          {formatINR(t.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.createdBy}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {!selectedId && (
        <div className="bg-card rounded-xl border border-border shadow-card p-12 text-center text-sm text-muted-foreground">
          Select a flat owner above to view their account statement.
        </div>
      )}

      {/* Add Manual Entry Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent data-ocid="accounts.add.dialog" className="max-w-sm">
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
                  <SelectItem value={TransactionType.Credit}>Credit</SelectItem>
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
  );
}
