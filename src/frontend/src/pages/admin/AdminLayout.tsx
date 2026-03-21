import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Bell,
  BookOpen,
  Eye,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { AdminActorProvider } from "../../contexts/AdminActorContext";
import AccountsPage from "./AccountsPage";
import AdminDashboardPage from "./AdminDashboardPage";
import MaintenancePage from "./MaintenancePage";
import ResidentsPage from "./ResidentsPage";
import SettingsPage from "./SettingsPage";

export type AdminPage =
  | "dashboard"
  | "residents"
  | "maintenance"
  | "accounts"
  | "settings";

const NAV_ITEMS: { id: AdminPage; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  { id: "residents", label: "Residents", icon: <Users className="w-4 h-4" /> },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: <Wrench className="w-4 h-4" />,
  },
  { id: "accounts", label: "Accounts", icon: <BookOpen className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

const PAGE_TITLES: Record<AdminPage, string> = {
  dashboard: "Admin Dashboard",
  residents: "Residents List",
  maintenance: "Maintenance",
  accounts: "Accounts",
  settings: "Settings",
};

interface Props {
  onLogout: () => void;
}

export default function AdminLayout({ onLogout }: Props) {
  const [currentPage, setCurrentPage] = useState<AdminPage>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (id: AdminPage) => {
    setCurrentPage(id);
    setMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Eye className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-semibold text-[15px] leading-tight">
          Third Eye Home
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            type="button"
            key={item.id}
            data-ocid={`nav.${item.id}.link`}
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

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          type="button"
          data-ocid="nav.logout.button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <AdminActorProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-60 flex-shrink-0 bg-sidebar flex-col fixed h-full z-20">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
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
          <nav className="flex-1 py-4 px-3 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                type="button"
                key={item.id}
                data-ocid={`mobile.nav.${item.id}.link`}
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
              data-ocid="mobile.nav.logout.button"
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
          <header className="bg-card border-b border-border px-4 md:px-6 py-3.5 flex items-center gap-4 sticky top-0 z-10">
            {/* Mobile: hamburger */}
            <button
              type="button"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
              data-ocid="topbar.menu.button"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Title */}
            <h1 className="text-base md:text-lg font-semibold text-foreground flex-1 md:flex-none md:min-w-48 text-center md:text-left">
              {PAGE_TITLES[currentPage]}
            </h1>

            {/* Desktop: search */}
            <div className="hidden md:block flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-ocid="topbar.search_input"
                  placeholder="Search residents, transactions…"
                  className="pl-9 h-9 bg-background border-border text-sm"
                />
              </div>
            </div>

            <div className="ml-auto md:ml-0 flex items-center gap-2 md:gap-3">
              <button
                type="button"
                className="hidden md:flex relative w-9 h-9 rounded-lg hover:bg-accent transition-colors items-center justify-center"
                data-ocid="topbar.bell.button"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
              </button>
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                  AD
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block leading-tight">
                <p className="text-xs font-semibold text-foreground">Admin</p>
                <p className="text-[10px] text-muted-foreground">
                  Administrator
                </p>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            {currentPage === "dashboard" && (
              <AdminDashboardPage onNavigate={setCurrentPage} />
            )}
            {currentPage === "residents" && <ResidentsPage />}
            {currentPage === "maintenance" && <MaintenancePage />}
            {currentPage === "accounts" && <AccountsPage />}
            {currentPage === "settings" && <SettingsPage />}
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
    </AdminActorProvider>
  );
}
