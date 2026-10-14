# Revive Fitness Studio display update v3

## Upload this fix

1. Extract this ZIP. Replace the **index.html** that GitHub Pages actually publishes. This is the same folder as the existing live index.html, for example the repository root or docs folder, according to your Pages source settings.
2. Keep your existing config.js, logo files and Google Apps Script deployment. This package does not contain a blank config.js.
3. Commit the replacement and wait for the Pages deployment to finish.
4. Open your existing portal URL with `?v=20261015.3#/home` added. For example, `https://YOUR-ACCOUNT.github.io/YOUR-REPOSITORY/?v=20261015.3#/home`. The footer must show **v3**. If v3 does not appear, the live site is still serving another index.html or an older deployment.

## Logo

The page loads `assets/revive-logo.svg` relative to index.html by default, with a version parameter. It keeps an embedded Revive wordmark visible until the uploaded image has loaded. A missing or invalid image cannot leave an empty header.

If your actual logo has a different name or folder, add `LOGO_URL` to your existing window.REVIVE_CONFIG object in config.js, preserving SHEETS_API_URL. Example:

```js
window.REVIVE_CONFIG = {
  SHEETS_API_URL: 'YOUR_EXISTING_APPS_SCRIPT_URL',
  LOGO_URL: './logo.png'
};
```

Use the exact filename and capitalization. A filename is relative to the folder containing index.html. If the embedded wordmark stays visible, the custom image could not load from the configured URL.

## App pages

All five modules open as full page views with fixed branding and copyright. There are no modal dialogs or backdrops. Module links use `#/admission`, `#/attendance`, `#/store`, `#/staff`, and `#/admin`.

Back returns to the previous in-app screen. Browser Back/Forward and refreshing a module URL restore the appropriate screen. The logo returns home. Signed-in workspace routes require signing in again after a refresh, as the session remains in memory.

Styling and JavaScript are included in index.html, so older app.js and styles.css files cannot change this release's navigation. Backend/data behavior is inherited from the existing project. No live Sheets connection or hosted deployment is verified by this display-only update.
