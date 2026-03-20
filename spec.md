# Third Eye Home

## Current State
The Accounts section has two tabs: Individual Account (per-member Tally-style statement) and Society Statement (consolidated view). The backend stores transactions linked to flat owners. Admin Settings has Expense Categories and Payment Categories stored in localStorage.

## Requested Changes (Diff)

### Add
- New "Expense Entry" tab (3rd tab) in the Accounts section
- `ExpenseVoucher` type in backend: id, voucherNo, date, entryDate, category, description, amount, payee, remarks
- Backend functions: `addExpenseVoucher`, `getAllExpenseVouchers`, `deleteExpenseVoucher`
- Stable storage for expense vouchers with preupgrade/postupgrade hooks
- Expense Entry UI: list of vouchers in a table (voucher no, date, category, description, amount)
- "New Expense Entry" button opens a form: Voucher No (auto-generated), Date, Category (dropdown from expenseCategories in localStorage), Description, Amount, Payee (optional), Remarks (optional)
- Per-voucher Print/PDF button that prints a formatted voucher document
- Delete voucher button
- Voucher print format: header with society name, voucher number, date, category, payee, description, amount in words, remarks, authorized signature line

### Modify
- AccountsPage: add third tab "Expense Entry"
- Backend main.mo: add ExpenseVoucher type, stable vars, and CRUD functions
- backend.d.ts: add ExpenseVoucher interface and new function signatures

### Remove
- Nothing removed

## Implementation Plan
1. Update backend main.mo to add ExpenseVoucher type, stable variables, and functions (addExpenseVoucher, getAllExpenseVouchers, deleteExpenseVoucher)
2. Update backend.d.ts to reflect new types and functions
3. Add Expense Entry tab to AccountsPage with voucher list, add form dialog, and print/PDF per voucher
4. Expense categories loaded from localStorage (same key as Settings page)
5. Voucher number auto-generated as EXP-YYYY-NNNN format
6. Print format renders a clean A5/A4 voucher with header, details, amount in words, signature lines
