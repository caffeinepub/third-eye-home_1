import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  FlatOwnerPublic as FlatOwner,
  Transaction,
} from "../../backend.d";
import { TransactionType } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import { formatDate, formatINR, getCurrentMonthYear } from "../../utils/format";

export default function MaintenancePage() {
  const { actor, isFetching } = useActor();
  const [monthYear, setMonthYear] = useState(getCurrentMonthYear());
  const [running, setRunning] = useState(false);
  const [owners, setOwners] = useState<FlatOwner[]>([]);
  const [recentEntries, setRecentEntries] = useState<Transaction[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  useEffect(() => {
    if (!actor || isFetching) return;
    actor
      .getAllFlatOwners()
      .then(setOwners)
      .catch(() => null);
  }, [actor, isFetching]);

  const loadRecentEntries = useCallback(async () => {
    if (!actor || owners.length === 0) return;
    setLoadingEntries(true);
    try {
      const allTxns: Transaction[] = [];
      await Promise.all(
        owners.slice(0, 5).map(async (o) => {
          const txns = await actor.getFlatStatement(o.id);
          allTxns.push(
            ...txns
              .filter((t) => t.transactionType === TransactionType.Debit)
              .slice(0, 3),
          );
        }),
      );
      allTxns.sort((a, b) => (b.entryDate > a.entryDate ? 1 : -1));
      setRecentEntries(allTxns.slice(0, 20));
    } catch {
      null;
    } finally {
      setLoadingEntries(false);
    }
  }, [actor, owners]);

  useEffect(() => {
    loadRecentEntries();
  }, [loadRecentEntries]);

  const handleRunDebit = async () => {
    if (!actor) return;
    if (!monthYear.match(/^\d{2}-\d{4}$/)) {
      toast.error("Invalid format. Use MM-YYYY (e.g. 03-2026)");
      return;
    }
    setRunning(true);
    try {
      await actor.updateMaintenanceDebit(monthYear);
      toast.success(
        `Maintenance debit applied for ${monthYear} to all ${owners.length} flat(s)`,
      );
      loadRecentEntries();
    } catch (e: any) {
      toast.error(e?.message || "Failed to run maintenance debit");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Main action card */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-[oklch(0.94_0.04_252)] flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              Run Monthly Maintenance Debit
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assign maintenance charges to all {owners.length} flat owners for
              the selected month.
            </p>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <Label className="text-xs mb-1 block">Month-Year (MM-YYYY)</Label>
            <Input
              data-ocid="maintenance.month.input"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              placeholder="03-2026"
              className="h-10 font-mono"
            />
          </div>
          <Button
            type="button"
            data-ocid="maintenance.run.button"
            onClick={handleRunDebit}
            disabled={running}
            className="bg-primary hover:bg-primary/90 text-white h-10 px-6 font-medium"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Run Maintenance Debit for {monthYear}
          </Button>
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 bg-[oklch(0.94_0.04_252)] rounded-lg">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-foreground/70">
            Clicking "Run Maintenance Debit" will create a debit transaction
            equal to each owner's monthly maintenance amount in their statement.
            This action affects all {owners.length} registered flat owners.
          </p>
        </div>
      </div>

      {/* Recent debit entries */}
      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Maintenance Entries
          </h2>
        </div>
        {loadingEntries ? (
          <div
            data-ocid="maintenance.loading_state"
            className="p-8 text-center"
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          </div>
        ) : recentEntries.length === 0 ? (
          <div
            data-ocid="maintenance.empty_state"
            className="p-8 text-center text-sm text-muted-foreground"
          >
            No maintenance entries yet. Run the debit to generate entries.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[oklch(0.96_0.005_245)]">
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Flat Owner ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Description
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((t, i) => (
                  <TableRow
                    key={t.id.toString()}
                    data-ocid={`maintenance.item.${i + 1}`}
                    className="text-sm"
                  >
                    <TableCell className="text-muted-foreground">
                      {formatDate(t.entryDate)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.flatOwnerId.toString()}
                    </TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell className="font-medium text-destructive">
                      {formatINR(t.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
