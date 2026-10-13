# Revive Fitness Studio portal

A mobile-friendly studio operations portal styled from the supplied Revive reference. The portal includes a studio dashboard, member directory, new admissions, attendance check-in, a permanent payment ledger, reports, CSV export, and configuration.

## Run locally

Open `index.html` in a browser, or serve this folder with any static web server. Without a data endpoint, the portal runs in demo mode and saves sample data to this browser's local storage. The demo staff PIN is `1234`.

## Publish on GitHub Pages

1. Create a GitHub repository and add `index.html`, `styles.css`, `app.js`, and `google-apps-script.gs`.
2. In the repository, open **Settings → Pages**, choose the branch and folder containing `index.html`, then save.
3. Open the published site and connect the Apps Script web app URL under **Settings**.

The Apps Script source is provided as a starter data service. Open the target Google Sheet, use **Extensions → Apps Script**, paste `google-apps-script.gs`, set `SPREADSHEET_ID` if the script is standalone, and run `setupReviveSheets()` once. Add staff records in the `Staff` sheet with a unique name, PIN, role, and active status. Deploy as a web app and paste the URL ending in `/exec` in the portal.

## Data model

The service creates `Members`, `Transactions`, `Attendance`, `Staff`, and `Settings` tabs. Member profiles are archived by setting their status to inactive. Transaction and attendance rows are append-only so removing a profile from active use does not erase its history. Member IDs are assigned under a script lock from the existing sheet data. Admission checks for duplicate phone numbers on both client and server. Each write requires a staff PIN.

## Important deployment constraint

GitHub Pages serves static files only. It cannot keep a server credential private. Google Apps Script Content Service redirects responses to a one-time `script.googleusercontent.com` URL; browser cross-origin access and the deployment's access policy must be verified with your actual Google Workspace account and GitHub Pages origin. The portal's connection check is included for that reason. Google documents this redirect behavior and recommends following redirects in clients: https://developers.google.com/apps-script/guides/content

For a public, production deployment, put a secured backend between the GitHub Pages frontend and the Sheet. The backend should authenticate staff, rate-limit PIN attempts, validate every write, and access the Sheet using a service account or Apps Script. Do not store Google credentials or service account keys in this repository. Treat the Apps Script prototype as a private studio endpoint and restrict access to approved staff where your deployment settings permit.

## Current boundaries

- Configure studio name/branch and plan pricing for your operation.
- Staff and admin roles currently identify the PIN holder, but the interface does not yet enforce separate role permissions.
- Signature images are kept as data in the member row. For larger deployments, move them to private object storage and store a restricted file reference in the Sheet.
- The portal checks for same-day duplicate attendance. Re-admission workflows, staff administration UI, backups, and a secured hosted backend need to be added before using it as the sole production record system.
