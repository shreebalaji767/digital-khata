# Digital Khata

Static, offline-first business ledger and management app for GitHub Pages.

## Included
- Multiple independent business profiles in one browser
- Customer and supplier accounts with Udhaar/Jama ledger entries
- Payment history and WhatsApp reminder links
- GST/non-GST single-item invoices with print-to-PDF
- Product inventory, stock adjustments and low-stock alerts
- Expense tracking, reports, CSV export and JSON backup/restore
- Responsive layout and installable PWA with service-worker caching

## Enable GitHub Pages
1. Open Settings → Pages in this repository.
2. Under Build and deployment, choose Deploy from a branch.
3. Select branch main and folder / (root), then Save.
4. GitHub Pages will publish at https://shreebalaji767.github.io/digital-khata/

## Data and privacy
All records are stored in this browser's localStorage. There is no server, database, account system or cross-device synchronization. Export JSON backups regularly. Data may be lost if browser storage is cleared. This app does not send UPI payments, verify settlements, or send automatic SMS/WhatsApp reminders. WhatsApp sharing opens a pre-filled message for the user to send.

## Local development
Open index.html through a local static server to test service-worker/PWA behavior. Install/offline features require HTTPS or localhost.
