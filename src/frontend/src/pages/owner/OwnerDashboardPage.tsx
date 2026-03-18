import {
  CheckCircle,
  Home,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FlatOwnerPublic, Transaction } from "../../backend.d";
import { TransactionType } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import { formatDate, formatINR } from "../../utils/format";

interface Props {
  profile: FlatOwnerPublic | null;
  ownerId: bigint;
}

export default function OwnerDashboardPage({ profile, ownerId }: Props) {
  const { actor, isFetching } = useActor();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    actor
      .getFlatStatement(ownerId)
      .then((stmts) => {
        // calculate balance: sum(debits) - sum(credits)
        const bal = stmts.reduce((acc, t) => {
          return t.transactionType === TransactionType.Debit
            ? acc + t.amount
            : acc - t.amount;
        }, 0n);
        setBalance(bal < 0n ? 0n : bal);
        setRecentTxns([...stmts].reverse().slice(0, 3));
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [actor, isFetching, ownerId]);

  const isDue = balance !== null && balance > 0n;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Welcome + Flat info */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[oklch(0.94_0.04_252)] flex items-center justify-center flex-shrink-0">
            <Home className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Welcome, {profile?.ownerName || "Flat Owner"}!
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Unit:{" "}
              <strong>
                {profile ? `${profile.blockNo}-${profile.flatNo}` : "—"}
              </strong>
              {profile && (
                <>
                  {" "}
                  · Monthly Maintenance:{" "}
                  <strong>{formatINR(profile.maintenanceAmount)}</strong>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Balance card */}
      {loading ? (
        <div
          data-ocid="owner.dashboard.loading_state"
          className="bg-card rounded-xl border border-border shadow-card p-8 text-center"
        >
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        <div
          className={`rounded-xl border shadow-card p-5 ${
            isDue
              ? "bg-[oklch(0.98_0.01_25)] border-[oklch(0.9_0.05_25)]"
              : "bg-[oklch(0.97_0.02_150)] border-[oklch(0.88_0.06_150)]"
          }`}
        >
          <div className="flex items-center gap-3">
            {isDue ? (
              <TrendingDown className="w-8 h-8 text-destructive" />
            ) : (
              <CheckCircle className="w-8 h-8 text-[oklch(0.55_0.15_150)]" />
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Current Balance / Dues
              </p>
              <p
                className={`text-2xl font-bold ${
                  isDue ? "text-destructive" : "text-[oklch(0.45_0.15_150)]"
                }`}
              >
                {balance !== null ? formatINR(balance) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isDue
                  ? "Outstanding dues — please contact admin for payment"
                  : "No pending dues — account is clear!"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Transactions
          </h2>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          </div>
        ) : recentTxns.length === 0 ? (
          <div
            data-ocid="owner.recent.empty_state"
            className="p-8 text-center text-sm text-muted-foreground"
          >
            No transactions yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentTxns.map((t, i) => (
              <div
                key={t.id.toString()}
                data-ocid={`owner.recent.item.${i + 1}`}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  {t.transactionType === TransactionType.Debit ? (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-[oklch(0.55_0.15_150)]" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.entryDate)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    t.transactionType === TransactionType.Debit
                      ? "text-destructive"
                      : "text-[oklch(0.55_0.15_150)]"
                  }`}
                >
                  {t.transactionType === TransactionType.Debit ? "-" : "+"}
                  {formatINR(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
