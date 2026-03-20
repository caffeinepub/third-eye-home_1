import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { SocietyOverview } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import { formatINR } from "../../utils/format";
import type { AdminPage } from "./AdminLayout";

interface Props {
  onNavigate: (page: AdminPage) => void;
}

export default function AdminDashboardPage({ onNavigate }: Props) {
  const { actor, isFetching } = useActor();
  const [overview, setOverview] = useState<SocietyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!actor || isFetching) return;
    actor
      .getSocietyOverview()
      .then(setOverview)
      .catch(() => setError("Failed to load overview"))
      .finally(() => setLoading(false));
  }, [actor, isFetching]);

  const kpis = overview
    ? [
        {
          label: "Total Flats",
          value: overview.totalFlats.toString(),
          sub: "Registered units",
          icon: <Users className="w-5 h-5 text-primary" />,
          bg: "bg-[oklch(0.94_0.04_252)]",
        },
        {
          label: "Total Pending Dues",
          value: formatINR(overview.totalPendingDues),
          sub: "Outstanding balance",
          icon: <TrendingDown className="w-5 h-5 text-destructive" />,
          bg: "bg-[oklch(0.96_0.03_25)]",
        },
        {
          label: "Total Collected",
          value: formatINR(overview.totalCollected),
          sub: "Payments received",
          icon: <TrendingUp className="w-5 h-5 text-[oklch(0.55_0.15_150)]" />,
          bg: "bg-[oklch(0.95_0.04_200)]",
        },
      ]
    : [];

  const quickLinks = [
    {
      label: "Manage Residents",
      desc: "Add, edit or remove flat owners",
      page: "residents" as AdminPage,
    },
    {
      label: "Run Maintenance Debit",
      desc: "Assign monthly charges to all flats",
      page: "maintenance" as AdminPage,
    },
    {
      label: "View Accounts",
      desc: "Browse all transactions & statements",
      page: "accounts" as AdminPage,
    },
  ];

  const showRestoreBanner =
    !loading && !error && overview !== null && overview.totalFlats === 0n;

  return (
    <div className="space-y-6">
      {/* Restore banner -- shown when no residents found after loading */}
      {showRestoreBanner && (
        <div
          data-ocid="dashboard.restore.panel"
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900"
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
          <p className="flex-1 text-sm font-medium">
            No residents found. If you have a backup file, go to Settings to
            restore your data.
          </p>
          <Button
            size="sm"
            variant="outline"
            data-ocid="dashboard.restore.button"
            onClick={() => onNavigate("settings")}
            className="border-amber-400 text-amber-800 hover:bg-amber-100 shrink-0"
          >
            Go to Settings
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Society Overview
        </h2>
        {loading ? (
          <div
            data-ocid="dashboard.loading_state"
            className="grid grid-cols-3 gap-4"
          >
            {["flats", "pending", "collected"].map((k) => (
              <div key={k} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p
            data-ocid="dashboard.error_state"
            className="text-destructive text-sm"
          >
            {error}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-background"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center flex-shrink-0`}
                >
                  {kpi.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">
                    {kpi.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickLinks.map((item) => (
          <button
            type="button"
            key={item.page}
            data-ocid={`dashboard.${item.page}.button`}
            onClick={() => onNavigate(item.page)}
            className="bg-card rounded-xl border border-border shadow-card p-5 text-left hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-[oklch(0.94_0.04_252)] flex items-center justify-center mb-3">
              <ArrowRight className="w-4 h-4 text-foreground/60" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {item.label}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
