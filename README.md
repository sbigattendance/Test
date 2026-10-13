# Revive Fitness Studio Portal

A mobile-first portal for GitHub Pages, with the studio's white, charcoal and vivid orange look. The front end is static HTML, CSS and JavaScript. Google Sheets is the record store through the included Apps Script web app.

## Publish on GitHub Pages

1. Add the project files to a GitHub repository.
2. In **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
3. Open the Pages URL after deployment.

## Connect Google Sheets

1. Create a Google Sheet for the studio. Under **Extensions → Apps Script**, paste `google-apps-script/Code.gs` into `Code.gs` and save. If the script is standalone, paste the spreadsheet ID into `DB_ID`; for a bound script, leave it blank.
2. In Apps Script **Project Settings**, set the project time zone to `Asia/Kolkata`.
3. Run `doGet` once from the editor to authorize it. The script creates the `Members`, `Attendance`, `Admissions`, `Products`, `Sales` and `Staff` tabs with headers on first request.
4. Create one staff row in `Staff`: `username`, `name`, `role`, `pinHash`, `active`. Set role to `staff` or `admin`, active to `TRUE`. To get a PIN hash, run this helper in the Apps Script editor after replacing the sample value, then copy the returned hex string into `pinHash`:

   ```js
   function makePinHash() {
     const pin = 'REPLACE_WITH_A_LONG_UNIQUE_PIN';
     return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin, Utilities.Charset.UTF_8)
       .map(b => (b + 256).toString(16).slice(-2)).join('');
   }
   ```

   Use a long unique PIN rather than a short numeric code. Access to the sheet should be limited to trusted studio admins.
5. Deploy → **New deployment** → type **Web app**. Execute as **Me**, set access to **Anyone**, deploy, and authorize the deployment. Copy the URL ending in `/exec`.
6. Paste that URL into `SHEETS_API_URL` in `config.js`, commit, and push the change to GitHub.
7. Add products as rows in `Products`, with `id`, `name`, `description`, `price`, `stock`, and `active` (`TRUE`). Create staff credentials in the `Staff` tab.

## Current data flow

- Admission requests append to `Admissions` with `Pending` status.
- Daily attendance looks up active members in `Members`, then appends check-ins to `Attendance`.
- Supplement requests and staff recorded sales append to `Sales`.
- Staff and admin sign-in is checked against the `Staff` tab. Admin dashboard reads summary counts and current sheet records.
- Product catalog reads from `Products`.

New admission requests are captured for review in `Admissions`. To activate a new member, the studio admin should add that person to `Members` with a unique `memberId` and `Active` status. The Sheets backend does not currently charge payments, process refunds, or manage subscriptions.

## Security and deployment notes

This is a static GitHub Pages front end and Apps Script is a lightweight small-studio backend. Do not store payment card data or sensitive health information in these sheets. Anyone with the web app URL can submit an admission request, so restrict spreadsheet access and review Apps Script deployment access. Staff PINs are hashed in the sheet. For stronger authentication, audit logs, or multi-branch use, place a server-side API in front of the sheet and avoid sharing the Apps Script endpoint publicly.

## Files

- `index.html`, `styles.css`, `app.js`: portal interface and interactions
- `config.js`: Apps Script endpoint setting
- `assets/`: logo and favicon assets
- `google-apps-script/Code.gs`: Sheets API and sheet initialization
