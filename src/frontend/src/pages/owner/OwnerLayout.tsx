import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import type { FlatOwnerPublic } from "../../backend.d";
import OwnerDashboardPage from "./OwnerDashboardPage";
import OwnerProfilePage from "./OwnerProfilePage";
import OwnerStatementPage from "./OwnerStatementPage";

export type OwnerPage = "dashboard" | "statement" | "profile";

const NAV_ITEMS: { id: OwnerPage; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    id: "statement",
    label: "My Statement",
    icon: <FileText className="w-4 h-4" />,
  },
  { id: "profile", label: "My Profile", icon: <User className="w-4 h-4" /> },
];

const PAGE_TITLES: Record<OwnerPage, string> = {
  dashboard: "Owner Dashboard",
  statement: "My Statement",
  profile: "My Profile",
};

interface Props {
  initialProfile: FlatOwnerPublic | null;
  onLogout: () => void;
}

export default function OwnerLayout({ initialProfile, onLogout }: Props) {
  const [currentPage, setCurrentPage] = useState<OwnerPage>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = initialProfile?.ownerName
    ? initialProfile.ownerName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "OW";

  const ownerId = initialProfile?.id ?? 0n;

  const handleNavClick = (id: OwnerPage) => {
    setCurrentPage(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-sidebar flex-col fixed h-full z-20">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-[15px] leading-tight">
            Third Eye Home
          </span>
        </div>

        {/* Owner info */}
        {initialProfile && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary/20 text-white text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">
                  {initialProfile.ownerName}
                </p>
                <p className="text-sidebar-foreground text-[11px]">
                  {initialProfile.blockNo}-{initialProfile.flatNo}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              data-ocid={`owner.nav.${item.id}.link`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                currentPage === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            type="button"
            data-ocid="owner.logout.button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 md:hidden bg-black/50 cursor-default"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-sidebar flex flex-col z-40 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-[15px] leading-tight">
              Third Eye Home
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sidebar-foreground hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile owner info */}
        {initialProfile && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary/20 text-white text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">
                  {initialProfile.ownerName}
                </p>
                <p className="text-sidebar-foreground text-[11px]">
                  {initialProfile.blockNo}-{initialProfile.flatNo}
                </p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              data-ocid={`owner.mobile.nav.${item.id}.link`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] font-medium transition-colors ${
                currentPage === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            type="button"
            data-ocid="owner.mobile.logout.button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-3.5 flex items-center gap-3 sticky top-0 z-10">
          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            data-ocid="owner.topbar.menu.button"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>

          <h1 className="text-base md:text-lg font-semibold text-foreground flex-1 text-center md:text-left">
            {PAGE_TITLES[currentPage]}
          </h1>

          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block leading-tight">
              <p className="text-xs font-semibold text-foreground">
                {initialProfile?.ownerName || "Flat Owner"}
              </p>
              <p className="text-[10px] text-muted-foreground">Flat Owner</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {currentPage === "dashboard" && (
            <OwnerDashboardPage profile={initialProfile} ownerId={ownerId} />
          )}
          {currentPage === "statement" && (
            <OwnerStatementPage ownerId={ownerId} />
          )}
          {currentPage === "profile" && (
            <OwnerProfilePage profile={initialProfile} />
          )}
        </main>

        <footer className="py-4 px-6 text-center text-xs text-muted-foreground border-t border-border">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </footer>
      </div>
    </div>
  );
}
