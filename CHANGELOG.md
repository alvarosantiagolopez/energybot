# Changelog

# Changelog

## [1.6.0] 17-08-2026

### Added
- `crm_contacts` table (`backend/db/schema.sql`): stores simulated CRM contacts keyed by company name, with last synced invoice/consumption, anomaly status, and sync status/timestamp.
- `backend/services/crmService.js`: `syncInvoiceToCRM()` finds or creates a CRM contact by company name and updates it with the latest invoice/analysis data; `getAllContacts()` lists all contacts.
- `GET /api/crm/contacts` endpoint (`backend/routes/crm.js`): returns all CRM contacts.
- `POST /api/invoices/extract` now calls `syncInvoiceToCRM()` automatically after saving each invoice and includes the result as `crmSync` in the response.
- CRM view (`frontend/src/components/CrmView.jsx`), added to navigation as "CRM": table of all contacts with company, last consumption, anomaly status (colored dot), sync status, and last synced timestamp.
- Result view now shows a "✓ Synced with CRM" badge confirming the automatic sync.
- ADR 006 (`docs/decisions/006-simulated-crm-integration.md`): documents simulating a CRM integration (find-or-create, automatic sync, status tracking) instead of connecting to a real HubSpot/Salesforce sandbox, and what would change for production.

## [1.5.0] 15-08-2026

### Added
- Dashboard view (`frontend/src/components/DashboardView.jsx`): home page showing total invoices analyzed, total spend, average consumption, latest anomaly, and consumption/cost line charts over time (via `recharts`), all sourced from `GET /api/invoices`.
- `frontend/src/components/Header.jsx`: shared navigation header with `react-router-dom` `NavLink`s for Dashboard, Upload, and History.
- Client-side routing (`react-router-dom`) with `/dashboard`, `/upload`, `/history` routes; `/` redirects to `/dashboard`.
- Empty states (no invoices yet) and error states across Dashboard and History views.

### Changed
- Full visual redesign (`frontend/src/App.css`) applying the design system: dark navy (`#0F172A`) header, white cards with subtle shadows and rounded corners, blue (`#3B82F6`) primary accent, green (`#10B981`) for positive/clean indicators, red (`#EF4444`) for anomalies/warnings.
- History view: anomaly column now uses a colored dot indicator (red/green) instead of a text badge; rows alternate background color.
- Result view: invoice summary fields (company, period, consumption, total cost) promoted to metric cards; recommendation cards now use emoji icons instead of numbered badges; "Upload Another Invoice" renamed to "Analyze Another Invoice".
- Upload view copy updated to match spec: "Drop your energy invoice here" / "Supports PDF, JPG, PNG".

## [1.4.0] 15-08-2026

### Added
- `@fastify/static` plugin dependency in `backend/package.json`.
- Root `Dockerfile`: single multi-stage build that builds `frontend/dist` then copies it into the backend image; backend serves both the API and the static frontend from one Railway service.
- Root `railway.json`: single-service Railway build/deploy configuration.
- ADR 005 (`docs/decisions/005-single-service-static-frontend.md`): documents serving the frontend as static files from the Fastify backend instead of a separate nginx service.

### Changed
- `backend/server.js`: when `NODE_ENV=production`, registers `@fastify/static` to serve `frontend/dist` and falls back to `index.html` for unmatched non-API routes (client-side routing), while unmatched `/api/*` routes still return a JSON 404.

### Removed
- `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `backend/railway.json`, `frontend/railway.json` — replaced by the single root `Dockerfile`/`railway.json` per ADR 005. ADR 004 marked as superseded.

## [1.3.0] 15-08-2026

### Added
- `backend/Dockerfile` and `frontend/Dockerfile`: multi-stage Docker builds for Railway deployment. Backend runs on `node:20-alpine`; frontend builds with Vite then serves the static output via `nginx:alpine`.
- `frontend/nginx.conf`: proxies `/api/*` to the backend service over Railway's private network and falls back to `index.html` for client-side routing.
- `backend/railway.json` and `frontend/railway.json`: per-service Railway build/deploy configuration.
- ADR 004 (`docs/decisions/004-railway-deployment-with-docker.md`): documents the decision to deploy backend and frontend as separate Dockerized Railway services with an nginx reverse proxy.

### Changed
- `frontend/src/api.js`: `API_BASE_URL` changed from hardcoded `http://localhost:3000` to a relative empty string, so requests work through the nginx proxy in production without an environment-specific build.

## [1.2.0] 15-08-2026

### Added
- Frontend UI (`frontend/src/`): Upload view with drag-and-drop file input and simulated real-time workflow steps, Result view with invoice data, historical comparison, anomalies, AI analysis, and recommendation cards, and History view listing all analyzed invoices with click-to-expand detail.
- `frontend/src/api.js`: fetch-based client for `/api/invoices/extract` and `/api/invoices`.


## [1.1.0] 15-08-2026

### Added
- Analysis service (`backend/services/analysisService.js`): `analyzeInvoice()` queries the last 6 invoices from PostgreSQL, computes historical averages (consumption, cost per kWh, total cost) and percentage deviations, flags anomalies above a 20% threshold, and calls the Claude API to generate a natural-language analysis and 2-3 recommendations in Spanish. `saveInvoice()` persists the extracted data and analysis to the `invoices` table.
- `GET /api/invoices` endpoint: returns all invoices ordered by `created_at DESC`.
- ADR 003 (`docs/decisions/003-memory-through-postgresql.md`): documents the decision to use PostgreSQL as the agent's memory layer for historical comparison.

### Changed
- `POST /api/invoices/extract` now runs the full pipeline (extract → analyze → save) and returns the saved invoice plus comparison, anomalies, analysis, and recommendations, instead of extraction-only output.

## [1.0.0] 14-08-2026

### Added
- Claude extraction service (`backend/services/claudeService.js`): extracts structured invoice data (company, billing period, kWh consumption, total cost, cost per kWh, contract type) from a PDF using the Claude API's native document support and structured outputs.
- `POST /api/invoices/extract` endpoint (`backend/routes/invoices.js`): accepts a multipart PDF upload, runs extraction, and returns the parsed JSON. Extraction only — no database persistence yet.