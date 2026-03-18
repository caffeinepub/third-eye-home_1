import { Bell, Building2, Eye, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-5">
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
