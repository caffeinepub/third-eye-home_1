import { Ed25519KeyIdentity } from "@dfinity/identity";

const STORAGE_KEY = "thirdeye_admin_key";

export function getOrCreateAdminIdentity(): Ed25519KeyIdentity {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return Ed25519KeyIdentity.fromJSON(stored);
    } catch {
      /* fall through */
    }
  }
  const identity = Ed25519KeyIdentity.generate();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity.toJSON()));
  return identity;
}

export function clearAdminIdentity() {
  sessionStorage.removeItem(STORAGE_KEY);
}
