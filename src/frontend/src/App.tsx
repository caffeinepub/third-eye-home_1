import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import type { FlatOwnerPublic } from "./backend.d";
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import OwnerLayout from "./pages/owner/OwnerLayout";

type AppView = "login" | "admin" | "owner";

export default function App() {
  const [view, setView] = useState<AppView>("login");
  const [ownerProfile, setOwnerProfile] = useState<FlatOwnerPublic | null>(
    null,
  );

  const handleAdminLogin = () => setView("admin");

  const handleOwnerLogin = (profile: FlatOwnerPublic) => {
    setOwnerProfile(profile);
    setView("owner");
  };

  const handleLogout = () => {
    setOwnerProfile(null);
    setView("login");
  };

  return (
    <>
      <Toaster />
      {view === "login" && (
        <LoginPage
          onAdminLogin={handleAdminLogin}
          onOwnerLogin={handleOwnerLogin}
        />
      )}
      {view === "admin" && <AdminLayout onLogout={handleLogout} />}
      {view === "owner" && (
        <OwnerLayout initialProfile={ownerProfile} onLogout={handleLogout} />
      )}
    </>
  );
}
