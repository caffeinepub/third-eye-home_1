import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Plus,
  RefreshCcw,
  Shield,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { TransactionType } from "../../backend";
import { useActor } from "../../hooks/useActor";

function ConnectionStatus({
  actor,
  isFetching,
}: {
  actor: unknown;
  isFetching: boolean;
}) {
  if (isFetching || !actor) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-medium">
        <Loader2 className="w-3 h-3 animate-spin" />
        Connecting...
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
      <CheckCircle2 className="w-3 h-3" />
      Connected
    </span>
  );
}

export default function SettingsPage() {
  const { actor, isFetching } = useActor();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [resetting, setResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expense Categories
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
  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("expenseCategories");
      return stored ? JSON.parse(stored) : DEFAULT_EXPENSE_CATEGORIES;
    } catch {
      return DEFAULT_EXPENSE_CATEGORIES;
    }
  });
  const [paymentCategories, setPaymentCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("paymentCategories");
      return stored ? JSON.parse(stored) : DEFAULT_PAYMENT_CATEGORIES;
    } catch {
      return DEFAULT_PAYMENT_CATEGORIES;
    }
  });
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [newPaymentCategory, setNewPaymentCategory] = useState("");

  const saveExpenseCategories = (cats: string[]) => {
    setExpenseCategories(cats);
    localStorage.setItem("expenseCategories", JSON.stringify(cats));
  };
  const savePaymentCategories = (cats: string[]) => {
    setPaymentCategories(cats);
    localStorage.setItem("paymentCategories", JSON.stringify(cats));
  };
  const addExpenseCategory = () => {
    const trimmed = newExpenseCategory.trim();
    if (!trimmed || expenseCategories.includes(trimmed)) return;
    saveExpenseCategories([...expenseCategories, trimmed]);
    setNewExpenseCategory("");
  };
  const addPaymentCategory = () => {
    const trimmed = newPaymentCategory.trim();
    if (!trimmed || paymentCategories.includes(trimmed)) return;
    savePaymentCategories([...paymentCategories, trimmed]);
    setNewPaymentCategory("");
  };

  const handleExportBackup = async () => {
    if (!actor) {
      toast.error("Connection not ready. Please wait a moment and try again.");
      return;
    }
    setExporting(true);
    try {
      const [owners, transactions] = await Promise.all([
        actor.getAllFlatOwners(),
        actor.getAllTransactions(),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        societyName: "Third Eye Residency",
        flatOwners: owners.map((o) => ({
          id: o.id != null ? String(o.id) : "0",
          blockNo: o.blockNo ?? "",
          flatNo: o.flatNo ?? "",
          ownerName: o.ownerName ?? "",
          phone: o.phone ?? "",
          maintenanceAmount:
            o.maintenanceAmount != null ? String(o.maintenanceAmount) : "0",
          username: o.username ?? "",
          createdAt:
            o.createdAt != null
              ? new Date(Number(o.createdAt) / 1_000_000).toISOString()
              : new Date().toISOString(),
        })),
        transactions: transactions.map((t) => ({
          id: t.id != null ? String(t.id) : "0",
          flatOwnerId: t.flatOwnerId != null ? String(t.flatOwnerId) : "0",
          date: t.date ?? "",
          entryDate:
            t.entryDate != null
              ? new Date(Number(t.entryDate) / 1_000_000).toISOString()
              : new Date().toISOString(),
          type: t.transactionType === "Debit" ? "Debit" : "Credit",
          description: t.description ?? "",
          amount: t.amount != null ? String(t.amount) : "0",
          createdBy: t.createdBy ?? "",
        })),
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date()
        .toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "-");
      a.href = url;
      a.download = `ThirdEyeHome_Backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(
        `Backup downloaded: ${owners.length} residents, ${transactions.length} transactions`,
      );
    } catch (err) {
      console.error(err);
      toast.error(
        `Failed to export backup: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!actor) {
      toast.error("Connection not ready. Please wait and try again.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImporting(true);
    setImportProgress("Reading backup file...");

    try {
      // Use FileReader for better cross-browser / mobile compatibility
      const rawText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target?.result as string) ?? "");
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsText(file, "utf-8");
      });

      // Strip UTF-8 BOM if present
      const text =
        rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText.trim();
      const backup = JSON.parse(text);

      // Support both `flatOwners` and legacy `residents` field names
      const owners: Array<{
        id: string;
        blockNo: string;
        flatNo: string;
        ownerName: string;
        phone: string;
        maintenanceAmount: string;
        username: string;
      }> = backup.flatOwners || backup.residents || [];

      const txns: Array<{
        flatOwnerId: string;
        date: string;
        type?: unknown;
        transactionType?: unknown;
        description: string;
        amount: string;
      }> = backup.transactions || [];

      if (owners.length === 0 && txns.length === 0) {
        toast.error(
          "Invalid backup file format or empty backup. Please use a valid Third Eye Home backup.",
        );
        setImporting(false);
        setImportProgress("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Show summary and ask for confirmation before proceeding
      const confirmed = window.confirm(
        `This backup contains ${owners.length} residents and ${txns.length} transactions.\n\nThis will restore all residents and transactions from the backup file.\n\nExisting data will NOT be deleted -- the backup data will be added on top.\n\nIf you want a clean restore, please delete all existing residents first from the Residents section, then import.\n\nContinue?`,
      );
      if (!confirmed) {
        setImporting(false);
        setImportProgress("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Step 1: Get current owners to avoid duplicate usernames
      setImportProgress("Checking existing residents...");
      const existingOwners = await actor.getAllFlatOwners();
      const existingUsernames = new Set(existingOwners.map((o) => o.username));

      // Map old ID -> new ID for transactions
      const idMap: Record<string, bigint> = {};

      // Step 2: Re-create flat owners
      let ownerCount = 0;
      let skippedCount = 0;
      let ownerFailCount = 0;
      for (const owner of owners) {
        if (existingUsernames.has(owner.username)) {
          // Already exists -- find their current ID
          const existing = existingOwners.find(
            (o) => o.username === owner.username,
          );
          if (existing) idMap[owner.id] = existing.id;
          skippedCount++;
          continue;
        }
        setImportProgress(
          `Restoring resident ${ownerCount + 1} of ${owners.length}...`,
        );
        try {
          const newId = await actor.createFlatOwner(
            owner.blockNo,
            owner.flatNo,
            owner.ownerName,
            owner.phone,
            BigInt(owner.maintenanceAmount || "0"),
            owner.username,
            "ThirdEye@1234", // default reset password
          );
          idMap[owner.id] = newId;
          ownerCount++;
        } catch (err) {
          console.error("Failed to create owner", owner.username, err);
          ownerFailCount++;
        }
      }

      // Step 3: Re-create transactions
      let txnCount = 0;
      for (const txn of txns) {
        const newOwnerId = idMap[txn.flatOwnerId];
        if (!newOwnerId) continue; // owner couldn't be mapped
        setImportProgress(
          `Restoring transaction ${txnCount + 1} of ${txns.length}...`,
        );
        try {
          // Support both `type` and `transactionType` fields (backward compat)
          const typeRaw = txn.type ?? (txn as any).transactionType;
          // Handle both string format ("Debit"/"Credit") and Motoko variant object ({ Debit: null })
          let typeStr: string;
          if (typeof typeRaw === "string") {
            typeStr = typeRaw;
          } else if (
            typeRaw &&
            typeof typeRaw === "object" &&
            "Debit" in (typeRaw as object)
          ) {
            typeStr = "Debit";
          } else {
            typeStr = "Credit";
          }
          const txType =
            typeStr === "Debit"
              ? TransactionType.Debit
              : TransactionType.Credit;
          await actor.addManualTransaction(
            newOwnerId,
            txType,
            txn.description,
            BigInt(txn.amount || "0"),
            txn.date,
          );
          txnCount++;
        } catch (err) {
          console.error("Failed to restore transaction", txn, err);
        }
      }

      toast.success(
        `Restore complete! ${ownerCount} residents restored${skippedCount > 0 ? ` (${skippedCount} already existed)` : ""}, ${txnCount} transactions restored.`,
      );
      if (skippedCount > 0) {
        toast.info(
          `Note: ${skippedCount} residents were skipped because they already exist. Their transactions were still restored.`,
        );
      }
      if (ownerFailCount > 0) {
        toast.warning(
          `Warning: ${ownerFailCount} residents could not be restored. Check the browser console for details.`,
        );
      }

      // Reload the page so admin immediately sees restored data
      window.location.reload();
    } catch (err: unknown) {
      console.error("Restore error:", err);
      toast.error(
        `Restore failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setImporting(false);
      setImportProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleResetFinancialData = async () => {
    if (!actor) return;
    const confirmed = window.confirm(
      "RESET FINANCIAL DATA\n\nThis will permanently delete ALL maintenance entries and expense transactions for every member.\n\nMember profiles and their maintenance amount settings will NOT be changed.\n\nThis action cannot be undone. Are you sure you want to continue?",
    );
    if (!confirmed) return;

    // Second confirmation for safety
    const doubleConfirmed = window.confirm(
      "Final confirmation: All financial entries (debits and credits) will be set to zero.\n\nClick OK to proceed.",
    );
    if (!doubleConfirmed) return;

    setResetting(true);
    try {
      await actor.resetFinancialData();
      toast.success(
        "Financial data has been reset. All maintenance and expense entries are now at zero. Member profiles and maintenance amounts are unchanged.",
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset financial data. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Download Backup */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[oklch(0.94_0.06_145)] flex items-center justify-center">
              <Download className="w-5 h-5 text-[oklch(0.45_0.15_145)]" />
            </div>
            <div>
              <h2 className="font-semibold">Download Backup</h2>
              <p className="text-xs text-muted-foreground">
                Download all residents and transactions as a backup file
              </p>
            </div>
          </div>
          <ConnectionStatus actor={actor} isFetching={isFetching} />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Export a complete backup of all flat owner profiles and transaction
          history. Save this file before any update to protect your data.
        </p>
        <Button
          onClick={handleExportBackup}
          disabled={exporting || !actor || isFetching}
          className="gap-2"
          data-ocid="settings.backup.button"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? "Exporting..." : "Download Backup (JSON)"}
        </Button>
      </div>

      {/* Upload / Restore Backup */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[oklch(0.94_0.06_45)] flex items-center justify-center">
              <Upload className="w-5 h-5 text-[oklch(0.55_0.18_45)]" />
            </div>
            <div>
              <h2 className="font-semibold">Restore from Backup</h2>
              <p className="text-xs text-muted-foreground">
                Upload a backup file to restore all residents and transactions
              </p>
            </div>
          </div>
          <ConnectionStatus actor={actor} isFetching={isFetching} />
        </div>

        <div className="flex items-start gap-2 p-3 bg-[oklch(0.97_0.03_45)] border border-[oklch(0.88_0.08_45)] rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-[oklch(0.6_0.18_45)] mt-0.5 shrink-0" />
          <p className="text-xs text-[oklch(0.45_0.12_45)]">
            Use this only after data loss. Residents that already exist will be
            skipped. Restored residents will have a temporary password:{" "}
            <strong>ThirdEye@1234</strong> -- ask them to change it after login.
          </p>
        </div>

        {importing && importProgress && (
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground animate-pulse flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {importProgress}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportBackup}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing || !actor || isFetching}
          variant="outline"
          className="gap-2"
          data-ocid="settings.restore.button"
        >
          {importing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {importing ? "Restoring..." : "Upload Backup File (JSON)"}
        </Button>
      </div>

      {/* Reset Financial Data */}
      <div className="bg-card rounded-xl border border-destructive/30 shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <RefreshCcw className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-destructive">
              Reset Financial Data
            </h2>
            <p className="text-xs text-muted-foreground">
              Clear all maintenance and expense entries to zero
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive/80">
            This will permanently delete all maintenance debits and expense
            credits for every member. Member profiles and their monthly
            maintenance amount settings will <strong>not</strong> be changed.
            Use this only for testing before handing the app to society members.
          </p>
        </div>

        <Button
          onClick={handleResetFinancialData}
          disabled={resetting || !actor}
          variant="destructive"
          className="gap-2"
          data-ocid="settings.reset_financial.button"
        >
          {resetting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}
          {resetting ? "Resetting..." : "Reset Financial Data to Zero"}
        </Button>
      </div>

      {/* Expense Categories */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[oklch(0.94_0.06_25)] flex items-center justify-center">
            <Tag className="w-5 h-5 text-[oklch(0.55_0.18_25)]" />
          </div>
          <div>
            <h2 className="font-semibold">Expense Categories</h2>
            <p className="text-xs text-muted-foreground">
              Manage categories for expense (debit) entries
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          These categories appear as quick-select options when adding debit
          transactions.
        </p>
        <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
          {expenseCategories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[oklch(0.94_0.06_25)] text-[oklch(0.45_0.15_25)] border border-[oklch(0.85_0.08_25)]"
            >
              {cat}
              <button
                type="button"
                onClick={() =>
                  saveExpenseCategories(
                    expenseCategories.filter((c) => c !== cat),
                  )
                }
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`Remove ${cat}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {expenseCategories.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No categories yet. Add one below.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newExpenseCategory}
            onChange={(e) => setNewExpenseCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExpenseCategory()}
            placeholder="New category name..."
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            data-ocid="settings.expense_category.input"
          />
          <Button
            size="sm"
            onClick={addExpenseCategory}
            className="gap-1.5 h-9"
            data-ocid="settings.expense_category.button"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Payment Categories */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[oklch(0.94_0.06_145)] flex items-center justify-center">
            <Tag className="w-5 h-5 text-[oklch(0.45_0.15_145)]" />
          </div>
          <div>
            <h2 className="font-semibold">Payment Categories</h2>
            <p className="text-xs text-muted-foreground">
              Manage categories for payment (credit) entries
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          These categories appear as quick-select options when adding credit
          transactions.
        </p>
        <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
          {paymentCategories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[oklch(0.94_0.06_145)] text-[oklch(0.35_0.13_145)] border border-[oklch(0.85_0.08_145)]"
            >
              {cat}
              <button
                type="button"
                onClick={() =>
                  savePaymentCategories(
                    paymentCategories.filter((c) => c !== cat),
                  )
                }
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`Remove ${cat}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {paymentCategories.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No categories yet. Add one below.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPaymentCategory}
            onChange={(e) => setNewPaymentCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPaymentCategory()}
            placeholder="New category name..."
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            data-ocid="settings.payment_category.input"
          />
          <Button
            size="sm"
            onClick={addPaymentCategory}
            className="gap-1.5 h-9"
            data-ocid="settings.payment_category.button"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Society Details */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[oklch(0.94_0.04_252)] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Society Details</h2>
            <p className="text-xs text-muted-foreground">
              Basic information about your housing society
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Society Name", value: "Third Eye Residency" },
            { label: "Location", value: "Mumbai, Maharashtra" },
            { label: "Total Blocks", value: "4 Blocks (A, B, C, D)" },
            { label: "Total Units", value: "120 Flats" },
          ].map((item) => (
            <div
              key={item.label}
              className="p-3 bg-background rounded-lg border border-border"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Access */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[oklch(0.95_0.04_200)] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[oklch(0.55_0.14_200)]" />
          </div>
          <div>
            <h2 className="font-semibold">Admin Access</h2>
            <p className="text-xs text-muted-foreground">
              Internet Identity powered authentication
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Admin access is managed via Internet Identity. To grant admin role to
          another principal, use the <strong>Assign User Role</strong> backend
          method.
        </p>
      </div>

      {/* About */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[oklch(0.96_0.03_25)] flex items-center justify-center">
            <Eye className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold">About Third Eye Home</h2>
            <p className="text-xs text-muted-foreground">Version information</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Third Eye Home is a comprehensive society management platform built on
          the Internet Computer. It provides real-time maintenance tracking,
          flat owner management, and transparent financial statements.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs bg-[oklch(0.94_0.04_252)] text-primary px-2 py-0.5 rounded font-medium">
            v1.0.0
          </span>
          <span className="text-xs text-muted-foreground">
            Powered by Internet Computer Protocol
          </span>
        </div>
      </div>
    </div>
  );
}
