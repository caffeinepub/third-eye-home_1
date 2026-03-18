import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { Transaction } from "../../backend.d";
import { TransactionType } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import { formatDate, formatINR } from "../../utils/format";

interface Props {
  ownerId: bigint;
}

export default function OwnerStatementPage({ ownerId }: Props) {
  const { actor, isFetching } = useActor();
  const [statement, setStatement] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    actor
      .getFlatStatement(ownerId)
      .then((stmts) => setStatement(stmts))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [actor, isFetching, ownerId]);

  const totalDebits = statement
    .filter((t) => t.transactionType === TransactionType.Debit)
    .reduce((a, t) => a + Number(t.amount), 0);
  const totalCredits = statement
    .filter((t) => t.transactionType === TransactionType.Credit)
    .reduce((a, t) => a + Number(t.amount), 0);
  const pendingBalance = Math.max(0, totalDebits - totalCredits);
  const isDue = pendingBalance > 0;

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="bg-card rounded-xl border border-border shadow-card p-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Total Transactions</p>
            <p className="text-xl font-bold">{statement.length}</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <p className="text-xs text-muted-foreground">Total Debits</p>
            <p className="text-xl font-bold text-destructive">
              {formatINR(totalDebits)}
            </p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <p className="text-xs text-muted-foreground">Total Credits</p>
            <p className="text-xl font-bold text-[oklch(0.55_0.15_150)]">
              {formatINR(totalCredits)}
            </p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <p className="text-xs text-muted-foreground">Outstanding Balance</p>
            <p
              className={`text-xl font-bold ${isDue ? "text-destructive" : "text-[oklch(0.55_0.15_150)]"}`}
            >
              {formatINR(pendingBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Statement table */}
      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Transaction History</h2>
        </div>
        {loading ? (
          <div
            data-ocid="owner.statement.loading_state"
            className="p-8 text-center"
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          </div>
        ) : statement.length === 0 ? (
          <div
            data-ocid="owner.statement.empty_state"
            className="p-8 text-center text-sm text-muted-foreground"
          >
            No transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[oklch(0.96_0.005_245)]">
                  <TableHead className="text-xs font-semibold">#</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Description
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statement.map((t, i) => (
                  <TableRow
                    key={t.id.toString()}
                    data-ocid={`owner.statement.item.${i + 1}`}
                    className={`text-sm ${
                      t.transactionType === TransactionType.Debit
                        ? "bg-[oklch(0.99_0.008_25)]"
                        : "bg-[oklch(0.99_0.008_150)]"
                    }`}
                  >
                    <TableCell className="text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(t.entryDate)}
                    </TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          t.transactionType === TransactionType.Debit
                            ? "text-destructive"
                            : "text-[oklch(0.55_0.15_150)]"
                        }`}
                      >
                        {t.transactionType === TransactionType.Debit ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        {t.transactionType}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`font-medium ${
                        t.transactionType === TransactionType.Debit
                          ? "text-destructive"
                          : "text-[oklch(0.55_0.15_150)]"
                      }`}
                    >
                      {t.transactionType === TransactionType.Debit ? "-" : "+"}
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
