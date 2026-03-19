import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Building2,
  Download,
  Eye,
  RefreshCcw,
  Shield,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { TransactionType } from "../../backend";
import { useActor } from "../../hooks/useActor";

export default function SettingsPage() {
  const { actor } = useActor();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [resetting, setResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = async () => {
    if (!actor) return;
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
          id: o.id.toString(),
          blockNo: o.blockNo,
          flatNo: o.flatNo,
          ownerName: o.ownerName,
          phone: o.phone,
          maintenanceAmount: o.maintenanceAmount.toString(),
          username: o.username,
          createdAt: new Date(Number(o.createdAt) / 1_000_000).toISOString(),
        })),
        transactions: transactions.map((t) => ({
          id: t.id.toString(),
          flatOwnerId: t.flatOwnerId.toString(),
          date: t.date,
          entryDate: new Date(Number(t.entryDate) / 1_000_000).toISOString(),
          type: t.transactionType === "Debit" ? "Debit" : "Credit",
          description: t.description,
          amount: t.amount.toString(),
          createdBy: t.createdBy,
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
      toast.error("Failed to export backup. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !actor) return;

    const confirmed = window.confirm(
      "This will restore all residents and transactions from the backup file.\n\nExisting data will NOT be deleted -- the backup data will be added on top.\n\nIf you want a clean restore, please delete all existing residents first from the Residents section, then import.\n\nContinue?",
    );
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImporting(true);
    setImportProgress("Reading backup file...");

    try {
      const rawText = await file.text();
      // Strip UTF-8 BOM if present
      const text =
        rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText.trim();
      const backup = JSON.parse(text);

      if (!backup.flatOwners || !backup.transactions) {
        toast.error(
          "Invalid backup file format. Please use a valid Third Eye Home backup.",
        );
        return;
      }

      const owners: Array<{
        id: string;
        blockNo: string;
        flatNo: string;
        ownerName: string;
        phone: string;
        maintenanceAmount: string;
        username: string;
      }> = backup.flatOwners;
      const txns: Array<{
        flatOwnerId: string;
        date: string;
        type?: unknown;
        transactionType?: unknown;
        description: string;
        amount: string;
      }> = backup.transactions;

      // Step 1: Get current owners to avoid duplicate usernames
      setImportProgress("Checking existing residents...");
      const existingOwners = await actor.getAllFlatOwners();
      const existingUsernames = new Set(existingOwners.map((o) => o.username));

      // Map old ID -> new ID for transactions
      const idMap: Record<string, bigint> = {};

      // Step 2: Re-create flat owners
      let ownerCount = 0;
      let skippedCount = 0;
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
            BigInt(owner.maintenanceAmount),
            owner.username,
            "ThirdEye@1234", // default reset password
          );
          idMap[owner.id] = newId;
          ownerCount++;
        } catch (err) {
          console.error("Failed to create owner", owner.username, err);
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
            BigInt(txn.amount),
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
    } catch (err: unknown) {
      console.error("Restore error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to read backup file: ${msg}`);
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
        <div className="flex items-center gap-3 mb-4">
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
        <p className="text-sm text-muted-foreground mb-4">
          Export a complete backup of all flat owner profiles and transaction
          history. Save this file before any update to protect your data.
        </p>
        <Button
          onClick={handleExportBackup}
          disabled={exporting || !actor}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          {exporting ? "Exporting..." : "Download Backup (JSON)"}
        </Button>
      </div>

      {/* Upload / Restore Backup */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
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

        <div className="flex items-start gap-2 p-3 bg-[oklch(0.97_0.03_45)] border border-[oklch(0.88_0.08_45)] rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-[oklch(0.6_0.18_45)] mt-0.5 shrink-0" />
          <p className="text-xs text-[oklch(0.45_0.12_45)]">
            Use this only after data loss. Residents that already exist will be
            skipped. Restored residents will have a temporary password:{" "}
            <strong>ThirdEye@1234</strong> -- ask them to change it after login.
          </p>
        </div>

        {importing && importProgress && (
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground animate-pulse">
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
          disabled={importing || !actor}
          variant="outline"
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
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
        >
          <RefreshCcw className="w-4 h-4" />
          {resetting ? "Resetting..." : "Reset Financial Data to Zero"}
        </Button>
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
