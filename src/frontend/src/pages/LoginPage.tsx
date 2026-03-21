import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Home, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import type { FlatOwnerPublic } from "../backend.d";
import { createActorWithConfig } from "../config";
import { useActor } from "../hooks/useActor";
type Portal = "portal" | "admin" | "owner";

interface LoginPageProps {
  onAdminLogin: () => void;
  onOwnerLogin: (profile: FlatOwnerPublic) => void;
}

// ── Desktop brand panel (hidden on mobile) ──
function BrandPanel({
  accent,
  icon: Icon,
  title,
  subtitle,
  features,
}: {
  accent: "admin" | "owner";
  icon: React.ElementType;
  title: string;
  subtitle: string;
  features: { label: string; desc: string }[];
}) {
  const bg =
    accent === "admin" ? "oklch(0.2 0.055 248)" : "oklch(0.2 0.055 180)";
  const iconBg =
    accent === "admin" ? "oklch(0.3 0.08 252)" : "oklch(0.3 0.08 175)";
  const iconColor =
    accent === "admin" ? "oklch(0.75 0.14 252)" : "oklch(0.72 0.14 175)";
  const textMuted =
    accent === "admin" ? "oklch(0.62 0.04 240)" : "oklch(0.62 0.04 180)";
  const dotColor =
    accent === "admin" ? "oklch(0.57 0.19 252)" : "oklch(0.55 0.18 175)";

  return (
    <div
      className="hidden md:flex md:w-[55%] flex-col justify-between p-12"
      style={{ background: bg }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Eye className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <span className="text-white font-bold text-[15px] tracking-tight">
          Third Eye Home
        </span>
      </div>

      <div className="max-w-xs">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
          style={{ background: iconBg }}
        >
          <Icon className="w-10 h-10" style={{ color: iconColor }} />
        </div>
        <h1
          className="text-4xl font-bold text-white leading-tight mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h1>
        <p className="text-sm mb-8" style={{ color: textMuted }}>
          {subtitle}
        </p>
        <div className="space-y-4">
          {features.map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <div
                className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: dotColor }}
              />
              <div>
                <p className="text-white text-[13px] font-semibold">
                  {f.label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: textMuted }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px]" style={{ color: "oklch(0.4 0.03 240)" }}>
        Third Eye Home — Society Management Platform
      </p>
    </div>
  );
}

// ── Mobile hero banner for login forms ──
function MobileHeroBanner({
  accent,
  icon: Icon,
  title,
}: {
  accent: "admin" | "owner";
  icon: React.ElementType;
  title: string;
}) {
  const bg =
    accent === "admin"
      ? "linear-gradient(160deg, oklch(0.18 0.07 252), oklch(0.25 0.06 240))"
      : "linear-gradient(160deg, oklch(0.18 0.07 175), oklch(0.25 0.06 190))";
  const iconBg =
    accent === "admin" ? "oklch(0.28 0.09 252)" : "oklch(0.28 0.09 175)";
  const iconColor =
    accent === "admin" ? "oklch(0.78 0.15 252)" : "oklch(0.75 0.15 175)";

  return (
    <div
      className="md:hidden w-full flex flex-col items-center justify-end pb-10 pt-12"
      style={{ background: bg, minHeight: "32vh" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
        style={{ background: iconBg }}
      >
        <Icon className="w-8 h-8" style={{ color: iconColor }} />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Eye className="w-4 h-4" style={{ color: "oklch(0.62 0.04 240)" }} />
        <span className="text-white text-xs font-semibold tracking-wide opacity-80">
          Third Eye Home
        </span>
      </div>
      <h1
        className="text-2xl font-bold text-white tracking-tight"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {title}
      </h1>
    </div>
  );
}

// ── Portal selector ──
function PortalSelector({
  onSelect,
}: { onSelect: (p: "admin" | "owner") => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile: Full-screen hero header */}
      <div
        className="md:hidden w-full flex flex-col items-center justify-end pb-10 pt-14"
        style={{
          minHeight: "38vh",
          background:
            "linear-gradient(160deg, oklch(0.15 0.06 248), oklch(0.22 0.055 255))",
        }}
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-xl"
          style={{ background: "oklch(0.28 0.09 252)" }}
        >
          <Eye
            className="w-10 h-10"
            style={{ color: "oklch(0.78 0.15 252)" }}
          />
        </div>
        <h1
          className="text-3xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Third Eye Home
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.62 0.04 240)" }}>
          Society Management Portal
        </p>
      </div>

      {/* Desktop: centered logo */}
      <div className="hidden md:flex flex-col items-center pt-14 mb-10">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
          <Eye className="w-8 h-8 text-white" />
        </div>
        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Third Eye Home
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Society Management Portal
        </p>
      </div>

      {/* Cards section */}
      <div
        className="flex-1 md:flex md:items-start md:justify-center bg-background"
        style={{ marginTop: "-1px" }}
      >
        {/* Mobile: rounded top card container sits over hero */}
        <div className="md:hidden -mt-6 bg-background rounded-t-3xl pt-6 px-5 pb-10 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] flex flex-col gap-4">
          <p className="text-xs text-muted-foreground text-center mb-1 font-medium uppercase tracking-widest">
            Choose your portal
          </p>

          {/* Admin card */}
          <button
            type="button"
            data-ocid="login.admin.button"
            onClick={() => onSelect("admin")}
            className="w-full text-left bg-card border border-border rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-[oklch(0.93_0.04_252)] flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground">
                Admin Login
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Society management &amp; financial control
              </p>
            </div>
            <span className="text-muted-foreground text-lg">›</span>
          </button>

          {/* Owner card */}
          <button
            type="button"
            data-ocid="login.owner.button"
            onClick={() => onSelect("owner")}
            className="w-full text-left bg-card border border-border rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-[oklch(0.93_0.04_175)] flex items-center justify-center flex-shrink-0">
              <Home className="w-6 h-6 text-[oklch(0.45_0.18_175)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground">
                Flat Owner Login
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                View statements &amp; track dues
              </p>
            </div>
            <span className="text-muted-foreground text-lg">›</span>
          </button>

          <p className="text-center text-xs text-muted-foreground pt-4">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              className="underline hover:text-foreground transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              caffeine.ai
            </a>
          </p>
        </div>

        {/* Desktop: grid cards */}
        <div className="hidden md:grid grid-cols-2 gap-6 w-full max-w-xl px-4 pb-12">
          <button
            type="button"
            data-ocid="login.admin.button"
            onClick={() => onSelect("admin")}
            className="group text-left bg-card border border-border rounded-2xl p-8 shadow-card hover:shadow-lg hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 rounded-xl bg-[oklch(0.93_0.04_252)] flex items-center justify-center mb-5">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">
              Admin Login
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Society Management · Resident control · Financial reports
            </p>
            <div className="mt-5">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0 text-[11px]">
                Admin Portal
              </Badge>
            </div>
          </button>

          <button
            type="button"
            data-ocid="login.owner.button"
            onClick={() => onSelect("owner")}
            className="group text-left bg-card border border-border rounded-2xl p-8 shadow-card hover:shadow-lg hover:border-[oklch(0.55_0.18_175)]/40 transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 rounded-xl bg-[oklch(0.93_0.04_175)] flex items-center justify-center mb-5">
              <Home className="w-6 h-6 text-[oklch(0.45_0.18_175)]" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">
              Flat Owner Login
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Resident Portal · View statements · Track dues
            </p>
            <div className="mt-5">
              <Badge className="bg-[oklch(0.93_0.04_175)] text-[oklch(0.35_0.16_175)] hover:bg-[oklch(0.93_0.04_175)] border-0 text-[11px]">
                Resident Portal
              </Badge>
            </div>
          </button>

          <p className="col-span-2 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              className="underline hover:text-foreground transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Admin Login ──
function AdminLoginForm({
  onBack,
  onSuccess,
}: { onBack: () => void; onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (username === "admin@thirdeye.in" && password === "ThirdEye@2026") {
        const adminActor = await createActorWithConfig();
        const ok = await adminActor.loginAdmin("ThirdEye@2026");
        if (ok) {
          onSuccess();
        } else {
          setError("Admin authentication failed. Please try again.");
        }
      } else {
        setError("Invalid admin credentials");
      }
    } catch (_err) {
      setError("Connection error. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop brand panel */}
      <BrandPanel
        accent="admin"
        icon={Shield}
        title="Admin Portal"
        subtitle="Society Management System"
        features={[
          {
            label: "Manage Residents",
            desc: "Add, update, and track all flat owners",
          },
          {
            label: "Financial Control",
            desc: "Generate statements and record transactions",
          },
          {
            label: "Maintenance Updates",
            desc: "Batch update monthly maintenance debits",
          },
        ]}
      />

      {/* Mobile hero banner */}
      <MobileHeroBanner accent="admin" icon={Shield} title="Admin Portal" />

      {/* Form area */}
      <div className="md:flex-1 md:bg-background md:flex md:flex-col md:items-center md:justify-center md:p-12">
        {/* Mobile: card floats over banner */}
        <div className="md:hidden -mt-6 bg-background rounded-t-3xl pt-6 px-5 pb-10 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] min-h-[68vh] flex flex-col">
          <button
            type="button"
            data-ocid="admin.login.back.button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <span>←</span> Back to portal selection
          </button>

          <div className="bg-card rounded-3xl border border-border shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground leading-none">
                  Admin Login
                </h2>
                <Badge className="mt-1 bg-primary/10 text-primary hover:bg-primary/10 border-0 text-[10px]">
                  Admin Portal
                </Badge>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="admin-username-m"
                  className="text-xs font-semibold"
                >
                  Admin Username
                </Label>
                <Input
                  id="admin-username-m"
                  data-ocid="admin.login.input"
                  type="text"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="admin-password-m"
                  className="text-xs font-semibold"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="admin-password-m"
                    data-ocid="admin.login.input"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="pr-10 h-12 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  data-ocid="admin.login.error_state"
                  className="text-xs text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-lg"
                >
                  {error}
                </p>
              )}

              <Button
                data-ocid="admin.login.submit_button"
                type="submit"
                className="w-full h-12 font-semibold text-sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Login to Admin Portal"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-auto pt-8">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              className="underline hover:text-foreground transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              caffeine.ai
            </a>
          </p>
        </div>

        {/* Desktop form */}
        <div className="hidden md:block w-full max-w-sm">
          <button
            type="button"
            data-ocid="admin.login.back.button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <span>←</span> Back to portal selection
          </button>

          <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground leading-none">
                  Admin Login
                </h2>
                <Badge className="mt-1 bg-primary/10 text-primary hover:bg-primary/10 border-0 text-[10px]">
                  Admin Portal
                </Badge>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="admin-username"
                  className="text-xs font-semibold"
                >
                  Admin Username
                </Label>
                <Input
                  id="admin-username"
                  type="text"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="admin-password"
                  className="text-xs font-semibold"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  data-ocid="admin.login.error_state"
                  className="text-xs text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-lg"
                >
                  {error}
                </p>
              )}

              <Button
                data-ocid="admin.login.submit_button"
                type="submit"
                className="w-full h-11 font-semibold text-sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Login to Admin Portal"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              className="underline hover:text-foreground transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Owner Login ──
function OwnerLoginForm({
  onBack,
  onSuccess,
}: { onBack: () => void; onSuccess: (profile: FlatOwnerPublic) => void }) {
  const { actor, isFetching } = useActor();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || isFetching) return;
    setError("");
    setLoading(true);
    try {
      const profile = await actor.loginOwner(username, password);
      if (profile) {
        onSuccess(profile);
      } else {
        setError("Invalid username or password");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop brand panel */}
      <BrandPanel
        accent="owner"
        icon={Home}
        title="Resident Portal"
        subtitle="Flat Owner Management"
        features={[
          {
            label: "View Statements",
            desc: "See all your transaction history",
          },
          {
            label: "Track Dues",
            desc: "Know your outstanding maintenance dues",
          },
          {
            label: "Account Profile",
            desc: "View your flat and contact details",
          },
        ]}
      />

      {/* Mobile hero banner */}
      <MobileHeroBanner accent="owner" icon={Home} title="Resident Portal" />

      {/* Form area */}
      <div className="md:flex-1 md:bg-background md:flex md:flex-col md:items-center md:justify-center md:p-12">
        {/* Mobile: card floats over banner */}
        <div className="md:hidden -mt-6 bg-background rounded-t-3xl pt-6 px-5 pb-10 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] min-h-[68vh] flex flex-col">
          <button
            type="button"
            data-ocid="owner.login.back.button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <span>←</span> Back to portal selection
          </button>

          <div className="bg-card rounded-3xl border border-border shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(0.45 0.18 175)" }}
              >
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground leading-none">
                  Flat Owner Login
                </h2>
                <Badge
                  className="mt-1 border-0 text-[10px]"
                  style={{
                    background: "oklch(0.93 0.04 175)",
                    color: "oklch(0.35 0.16 175)",
                  }}
                >
                  Resident Portal
                </Badge>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="owner-username-m"
                  className="text-xs font-semibold"
                >
                  Username
                </Label>
                <Input
                  id="owner-username-m"
                  data-ocid="owner.login.input"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="owner-password-m"
                  className="text-xs font-semibold"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="owner-password-m"
                    data-ocid="owner.login.input"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="pr-10 h-12 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  data-ocid="owner.login.error_state"
                  className="text-xs text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-lg"
                >
                  {error}
                </p>
              )}

              <Button
                data-ocid="owner.login.submit_button"
                type="submit"
                className="w-full h-12 font-semibold text-sm"
                style={{ background: "oklch(0.45 0.18 175)", color: "white" }}
                disabled={loading || isFetching}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Login to Resident Portal"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-auto pt-8">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              className="underline hover:text-foreground transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              caffeine.ai
            </a>
          </p>
        </div>

        {/* Desktop form */}
        <div className="hidden md:block w-full max-w-sm">
          <button
            type="button"
            data-ocid="owner.login.back.button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <span>←</span> Back to portal selection
          </button>

          <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(0.45 0.18 175)" }}
              >
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground leading-none">
                  Flat Owner Login
                </h2>
                <Badge
                  className="mt-1 border-0 text-[10px]"
                  style={{
                    background: "oklch(0.93 0.04 175)",
                    color: "oklch(0.35 0.16 175)",
                  }}
                >
                  Resident Portal
                </Badge>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="owner-username"
                  className="text-xs font-semibold"
                >
                  Username
                </Label>
                <Input
                  id="owner-username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="owner-password"
                  className="text-xs font-semibold"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="owner-password"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  data-ocid="owner.login.error_state"
                  className="text-xs text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-lg"
                >
                  {error}
                </p>
              )}

              <Button
                data-ocid="owner.login.submit_button"
                type="submit"
                className="w-full h-11 font-semibold text-sm"
                style={{ background: "oklch(0.45 0.18 175)", color: "white" }}
                disabled={loading || isFetching}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Login to Resident Portal"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              className="underline hover:text-foreground transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage({
  onAdminLogin,
  onOwnerLogin,
}: LoginPageProps) {
  const [portal, setPortal] = useState<Portal>("portal");

  if (portal === "portal") return <PortalSelector onSelect={setPortal} />;
  if (portal === "admin")
    return (
      <AdminLoginForm
        onBack={() => setPortal("portal")}
        onSuccess={onAdminLogin}
      />
    );
  return (
    <OwnerLoginForm
      onBack={() => setPortal("portal")}
      onSuccess={onOwnerLogin}
    />
  );
}
