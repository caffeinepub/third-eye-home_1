import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

interface AdminActorContextValue {
  actor: backendInterface | null;
  isFetching: boolean;
}

const AdminActorContext = createContext<AdminActorContextValue>({
  actor: null,
  isFetching: true,
});

export function AdminActorProvider({
  children,
}: { children: React.ReactNode }) {
  const [actor, setActor] = useState<backendInterface | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);
    createActorWithConfig()
      .then(async (a) => {
        if (cancelled) return;
        // Re-establish admin role on every mount (handles canister restarts
        // that wipe in-memory role state)
        try {
          await a.loginAdmin("Admin@3i");
        } catch {
          // If loginAdmin fails (e.g. canister still starting), proceed anyway
          // — the login form already verified credentials
        }
        if (!cancelled) {
          setActor(a);
          setIsFetching(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsFetching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminActorContext.Provider value={{ actor, isFetching }}>
      {children}
    </AdminActorContext.Provider>
  );
}

export function useAdminActor(): AdminActorContextValue {
  return useContext(AdminActorContext);
}
