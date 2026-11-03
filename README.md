# Digital Khata

Static, offline-first business ledger and management app for GitHub Pages.

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
All records are stored in this browser's localStorage. There is no server, database, account system or cross-device synchronization. Export JSON backups regularly. Data may be lost if browser storage is cleared. The app keeps a local recovery snapshot of the previous successful save where storage capacity permits.

UPI QR codes and UPI intent links are generated locally. The app cannot verify bank/UPI settlement or automatically send SMS/WhatsApp messages. WhatsApp sharing opens a pre-filled message for the user to send. Payment reconciliation is a manual bookkeeping flag, not a bank feed.

Financial, GST, profit and loss and ageing reports are estimates based on recorded entries. They are not a substitute for statutory accounting or tax advice; review figures with a qualified accountant before filing or issuing tax documents.

The bundled QRCode.js library is distributed under the MIT license; see [LICENSES/qrcodejs-MIT.txt](LICENSES/qrcodejs-MIT.txt).

## Local development
Open index.html through a local static server to test service-worker/PWA behavior. Install/offline features require HTTPS or localhost. Browser regression tests run with `npm install`, `npx playwright install chromium` and `npm run test:e2e`.
