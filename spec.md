# Third Eye Home

## Current State
Admin Settings page has Download Backup, Restore Backup, Society Details, Admin Access, and About sections. All financial transactions are stored in the `transactions` map on the backend.

## Requested Changes (Diff)

### Add
- Backend: `resetFinancialData()` function that clears all transactions and resets the transaction ID counter, without touching flat owner profiles or their `maintenanceAmount`.
- Frontend: "Reset Financial Data" button in Settings page with a red/danger-styled card, confirmation dialog before executing, and success/error toast.

### Modify
- Nothing else changed.

### Remove
- Nothing removed.

## Implementation Plan
1. Add `resetFinancialData` shared function to `main.mo` -- clears `transactions` map, resets `nextTransactionId` to 1, calls `syncStable()`.
2. Add a danger-styled card in `SettingsPage.tsx` with a "Reset Financial Data" button that calls `actor.resetFinancialData()` after a confirmation dialog.
