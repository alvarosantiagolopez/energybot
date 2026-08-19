# Changelog

## [1.8.0] 19-08-2026

### Added
- `backend/services/emailService.js`: `sendAnomalyAlert(invoiceData, analysisResult)` sends an HTML email via Resend when an anomaly is detected — company, billing period, current vs. average consumption with percent difference, anomaly description, and the top recommendation. Skips silently (`{ sent: false, reason }`) when there's no anomaly or email isn't configured.
- `resend` dependency added to `backend/package.json`; `RESEND_API_KEY` and `ALERT_EMAIL` environment variables added to `.env` / `.env.example`.
- `POST /api/invoices/extract` now calls `sendAnomalyAlert()` after the CRM sync step and includes the result as `emailAlert` in the response. Failures are caught and logged as warnings without breaking the request.
- Result view (`frontend/src/components/ResultView.jsx`): shows a "📧 Alert email sent" badge next to the company name and a note under the anomalies section when `emailAlert.sent` is true.
- ADR 008 (`docs/decisions/008-email-alerts-for-anomalies.md`): documents why automatic alerts matter (agent that acts, not just analyzes), why Resend over SendGrid/Mailgun, and how this would extend to Slack/PagerDuty/CRM-contact routing in production.

## [1.7.0] 17-08-2026

### Added
- `python-service/`: a FastAPI microservice for statistical trend analysis. `analyzer.py`'s `calculate_trends()` computes monthly average consumption/cost, a trend direction and percentage via linear regression (`scipy.stats.linregress`), summer-vs-winter seasonality detection, the peak consumption month, and an estimated savings potential in EUR. `main.py` exposes `POST /analyze-trends` and `GET /health`.
- `backend/services/analysisService.js`: `fetchTrends()` queries all historical invoices and calls the Python service; fails gracefully (logs a warning, returns `null`) if the service is unreachable or times out (10-second limit).
- `GET /api/invoices/trends` endpoint (`backend/routes/invoices.js`): lets the Dashboard fetch trend data independently of the upload flow. `POST /api/invoices/extract` now also includes a `trends` field in its response.
- Dashboard "Trend Analysis" card (`frontend/src/components/DashboardView.jsx`): trend direction with an arrow icon (↑/↓/→), percentage change, a seasonality badge, the peak consumption month, and — when positive — an estimated savings figure highlighted in green. Hidden entirely if the Python service didn't return data.
- Root `Dockerfile`: now a multi-language build that installs Python and Node in a single `python:3.12-alpine` base image. Frontend builds first, then both Python dependencies and Node dependencies are installed, and both services are packaged together.
- `docker-entrypoint.sh`: shell script that starts the Python service (port 8000) in the background, then the Node backend (port 3000) in the foreground; both run inside the same container.
- ADR 007 (`docs/decisions/007-python-microservice-for-statistics.md`): documents using Python for statistical analysis, the microservice pattern, graceful degradation, and the production-ready Docker setup with both services in one container.

## [1.6.1] 17-08-2026

### Added
- `backend/db/seed.js`: database seed script that populates 6 realistic demo invoices (3 from Endesa, 2 from Iberdrola with 1 anomaly, 1 from Naturgy) and auto-syncs them to CRM contacts.
- Seeded invoices include Spanish AI analysis and actionable recommendations; raw extracted data as JSONB; realistic consumption (45-180 kWh) and cost variations.
- One seeded Iberdrola invoice demonstrates anomaly detection (80%+ consumption increase).
- Seed script is idempotent: skips if >3 invoices already exist, making it safe to run multiple times.
- `npm run seed` script added to `backend/package.json`.

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