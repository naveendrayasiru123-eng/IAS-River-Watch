# IAS Watch — Western Province River Basins

Complete source package for the participatory IAS web map covering Kalu, Kelani and Attanagalu Oya.

## Included features
- Interactive map, stream networks, sample points and density views
- In-map IAS reporting with private photo storage
- Admin login and report verification
- Field verification of sample candidates
- Live Insights charts and verified observation register
- Source assets, videos, database schema and migrations

## Upload to GitHub
1. Extract this ZIP.
2. Create an empty repository in your GitHub account.
3. Open a terminal inside the extracted `IAS_River_Watch` folder.
4. Run the commands below, replacing YOUR_USERNAME and YOUR_REPOSITORY:

```sh
git init
git add .
git commit -m "Add IAS Watch web map"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

GitHub Desktop can also publish the extracted folder as a new repository.
Upload the folder contents, not the ZIP, so the code can be viewed and edited.

## Important: repository versus hosting
GitHub stores the source. GitHub Pages serves static files only. This complete app uses server API routes, a Cloudflare D1 database (`DB`) and an R2 photo bucket (`BUCKET`). A Pages-only upload cannot save reports, verify records, authenticate the admin or calculate live Insights.

The existing working deployment is:
https://ias-river-watch-wp.naveendrayasiru8128.chatgpt.site

This export retains its original Sites build configuration. Uploading it to GitHub does not move the live database or set up a new deployment. A new hosting account needs its own database, bucket, secrets and deployment configuration. The database ID in `vite.config.ts` is a local placeholder, not a production resource.

## Project structure
- `public/index.html`: main web map UI, inline styles and map logic
- `public/*.js`: stream data, charts, reporting and review interface
- `public/`: images, videos and other static assets
- `app/api/`: server routes for login, reports, photos, review and Insights
- `db/schema.ts`: database schema
- `drizzle/`: ordered SQL migrations
- `vite.config.ts`, `package.json`, `pnpm-lock.yaml`: build configuration and dependencies
- `.openai/hosting.json`: original Site identity and binding names
- `STARTER_README.md`: detailed original runtime and local database notes
- `FOOTAGE-SOURCE.md`: footage source information

## Local development
Install Node.js 22.13 or later and the pnpm version named in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

For a production build:

```sh
pnpm build
pnpm start
```

Follow `STARTER_README.md` for local database migrations and runtime setup. The exported configuration provides local binding emulation. Functional login and report storage additionally need initialized database tables and runtime secrets.

## Runtime secrets
The server requires:
- `IAS_ADMIN_PASSWORD_HASH`: `saltHex:hashHex`, generated using PBKDF2-SHA256, 100,000 iterations and a 32-byte derived key.
- `IAS_ADMIN_SESSION_KEY`: a cryptographically random 32-byte key encoded as hexadecimal.

The admin username in the server code is `IASadmin`. Configure the password hash and session key privately in your host's secret settings. Do not put a plaintext password, password hash, session key, API token or `.dev.vars` file in a public repository.

## Data and provenance
Existing submitted reports, photos, admin secrets and verification records live in the deployed services and are not included in this source ZIP. Publishing this repository does not erase or transfer them. A new deployment starts with its own storage unless you separately migrate that data.

The 160 demonstration candidates are synthetic. The application tracks field verification separately. Insights uses administrator-reviewed reports and recorded field checks; chart counts do not measure infestation area.

## Export reference
Exported from source commit c4339b3d42e40efa15e153a611a16620043fbec6 (published version 38), 29 September 2026. This ZIP adds this README and extra ignore rules; application source is preserved.
