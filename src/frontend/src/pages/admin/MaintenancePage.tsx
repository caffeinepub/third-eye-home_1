import { Button } from "@/components/ui/button";
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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Generate month options from April 2024 to April 2027
function generateMonthOptions() {
  const options: { label: string; value: string }[] = [];
  const start = { year: 2024, month: 4 }; // April 2024
  const end = { year: 2027, month: 4 }; // April 2027

  let { year, month } = start;
  while (year < end.year || (year === end.year && month <= end.month)) {
    const mm = String(month).padStart(2, "0");
    options.push({
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      value: `${mm}-${year}`,
    });
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return options;
}

const MONTH_OPTIONS = generateMonthOptions();

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

  const selectedLabel =
    MONTH_OPTIONS.find((o) => o.value === monthYear)?.label ?? monthYear;

  const handleRunDebit = async () => {
    if (!actor) return;
    setRunning(true);
    try {
      await actor.updateMaintenanceDebit(monthYear);
      toast.success(
        `Maintenance debit applied for ${selectedLabel} to all ${owners.length} flat(s)`,
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

        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-48 max-w-xs">
            <Label className="text-xs mb-1 block">
              Select Month &amp; Year
            </Label>
            <Select value={monthYear} onValueChange={setMonthYear}>
              <SelectTrigger
                data-ocid="maintenance.month.select"
                className="h-10"
              >
                <SelectValue placeholder="Select month…" />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                {MONTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            Run Debit for {selectedLabel}
          </Button>
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 bg-[oklch(0.94_0.04_252)] rounded-lg">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-foreground/70">
            Clicking "Run Debit" will create a debit transaction equal to each
            owner's monthly maintenance amount in their statement. This action
            affects all {owners.length} registered flat owners.
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
