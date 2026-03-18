# Third Eye Home

## Current State
The backend stores flat owners and transactions in non-stable Maps and non-stable counter variables. This means every time a new app version is deployed, all data (residents, transactions, maintenance history) is erased.

## Requested Changes (Diff)

### Add
- Stable backup arrays (`_flatOwnersStable`, `_transactionsStable`) to persist data across upgrades
- `system func preupgrade()` to serialize Maps into stable arrays before upgrade
- `system func postupgrade()` to restore Maps from stable arrays after upgrade

### Modify
- `nextFlatOwnerId` and `nextTransactionId` counters changed to `stable var` so IDs never reset

### Remove
- Nothing removed

## Implementation Plan
1. Declare stable backup arrays for flatOwners and transactions
2. Make ID counters stable
3. Add preupgrade hook to dump Maps into stable arrays
4. Add postupgrade hook to reload Maps from stable arrays and clear the backup arrays
