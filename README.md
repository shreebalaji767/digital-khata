# Digital Khata

Static, offline-first business and personal finance management app for GitHub Pages.

## Features
- Multiple independent business profiles in one browser
- Customer and supplier accounts with Udhaar/Jama ledger entries
- Multi-item GST and non-GST sales invoices
- Partial invoice payments and supplier purchase payments
- Payment reconciliation flags and printable payment receipts
- Purchase invoices, supplier balances and stock-in posting
- Sales and purchase returns with stock/account adjustments
- Inventory with unique SKU/barcode values, stock valuation and movement history
- Cashbook with inflows, outflows and running balance
- Profit and loss estimate, cash flow summary, GST summary and receivables ageing
- UPI intent links and locally generated UPI QR codes
- Printable invoices, WhatsApp invoice/reminder sharing
- JSON backup/restore with validation and last-known-good recovery snapshot
- CSV export, storage usage indicator and offline service-worker cache
- Light/dark theme, English/Hindi navigation labels and keyboard shortcuts
- Responsive layout, visible keyboard focus and installable PWA

- Separate Personal & Family workspace with income, expenses, lending, borrowing, repayments and account transfers
- Household member profiles with relationship and notes, member-wise expense attribution, chores and spending summaries
- Member-specific monthly budgets and savings goals, plus household-wide shared goals
- Recurring household bills with one-click paid status and automatic next due occurrence
- Recently deleted recycle bin with restore and permanent-delete actions
- Personal loan and EMI manager with principal reduction and cash-expense posting
- Vehicle register with odometer, insurance, PUC and service due-date references
- Inventory expiry / best-before dates with due-soon and expired indicators
- Duplicate personal transaction warnings, personal CSV export and printable PDF reports
- Family shared-expense splitting with equal shares, payer tracking, member balances and settlement records
- Household shopping list with quantities, estimated costs, assigned family members and bought/needed status
- Family settlement ledger is separate from the personal cashbook to avoid double-counting shared costs
- Personal cash/bank/UPI accounts, account balances and monthly category budgets
- Savings goals, household bills, spending analytics and a personal task planner
- Asset register for property, vehicles, investments and valuables, including estimated value and associated loans
- Subscription register with billing cycle, renewal date and active/paused/cancelled status
- Appointment and important-date planner, plus document/insurance/warranty/vehicle reference register
- Separate personal-data export; all personal records are included in full JSON backups
- Upgrade Centre with personal finance / net-worth dashboard and member-wise family dashboards
- Shared family category budgets, shared savings goals, family calendar and assignable chores
- Local documents vault with optional IndexedDB file attachments and renewal references
- Local reminders for household bills, loan EMI, vehicle insurance / PUC / service and inventory expiry
- Business performance dashboard with customer / supplier follow-up reminders, stock and expiry risk
- Combined financial CSV report and browser Print → Save as PDF report centre
- Automatic local backup snapshot after saves, periodic backup refresh, last-known-good recovery and three recent undo snapshots where storage permits
- Business ledger recycle bin with restore; personal / family recycle bin with restore and permanent-delete controls
- Stronger JSON import validation, transaction duplicate warnings and mobile-first upgrade centre controls
- Distinct personal/family and business books; personal transactions do not alter business ledgers

## Keyboard shortcuts
- Ctrl/Cmd + K: focus the current section's search field
- Ctrl/Cmd + Shift + N: add a ledger entry
- Ctrl/Cmd + Shift + I: create a sales invoice

## Enable GitHub Pages
1. Open Settings → Pages in this repository.
2. Under Build and deployment, choose Deploy from a branch.
3. Select branch main and folder / (root), then Save.
4. GitHub Pages will publish at https://shreebalaji767.github.io/digital-khata/

## Data and privacy
All records are stored in this browser's localStorage. There is no server, database, account system or cross-device synchronization. Export JSON backups regularly. Data may be lost if browser storage is cleared. The app keeps a latest automatic local snapshot, a last-known-good recovery copy and up to three recent undo snapshots where storage capacity permits. Business ledger deletions are recoverable from the recycle bin. IndexedDB document attachments remain on this browser and are not included in JSON backups; download them separately. Browser-local data is not encrypted or synced.

UPI QR codes and UPI intent links are generated locally. The app cannot verify bank/UPI settlement or automatically send SMS/WhatsApp messages. Due alerts and optional browser notifications are calculated locally while the app is open; background notifications are not guaranteed. WhatsApp sharing opens a pre-filled message for the user to send. Payment reconciliation is a manual bookkeeping flag, not a bank feed.

Financial, GST, profit and loss and ageing reports are estimates based on recorded entries. They are not a substitute for statutory accounting or tax advice; review figures with a qualified accountant before filing or issuing tax documents.

The bundled QRCode.js library is distributed under the MIT license; see [LICENSES/qrcodejs-MIT.txt](LICENSES/qrcodejs-MIT.txt).

## Local development
Open index.html through a local static server to test service-worker/PWA behavior. Install/offline features require HTTPS or localhost. Browser regression tests run with `npm install`, `npx playwright install chromium` and `npm run test:e2e`.
