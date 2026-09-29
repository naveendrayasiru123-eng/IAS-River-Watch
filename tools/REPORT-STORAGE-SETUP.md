# Connect the web-map form directly to Google Sheets

No Google Form is involved. The website fields stay inside the web map.

1. Open https://script.google.com in a browser signed into only your preferred Google account. Choose **New project**.
2. Paste the contents of `IAS-Report-Storage.gs` into Code.gs and save.
3. Select **setup** and click **Run**. Review and authorize the requested Sheets and Drive access. Setup creates a private **IAS Watch — Public Reports** spreadsheet and a private photo folder. The execution log prints the spreadsheet link. Running setup again reuses them.
4. Select **Deploy → New deployment → Web app**. Choose **Execute as: Me** and **Who has access: Anyone**. Deploy and copy the Web app URL ending in `/exec`.
5. Send the `/exec` URL to the website maintainer. It must be configured in `dist/report-config.js`, tested and published before visitors can submit.

Reports go to the **Web map reports** tab, including species, basin, coordinates, observation date, abundance, habitat, degradation, notes and photograph link. Photos remain private in Drive for the project owner to review. No names or email addresses are required. Do not make the spreadsheet or photo folder public.

Until the connection is configured, submission remains disabled. Downloaded drafts are not saved to Google. Deployment and a real submission have not yet been verified. This standalone version replaces the earlier instructions that required opening Apps Script from Google Forms.
