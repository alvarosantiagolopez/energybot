# ADR 007: Add a Python microservice for statistical trend analysis

## Status
Accepted

## Context
EnergyBot's existing analysis pipeline (`backend/services/analysisService.js`) compares a single invoice against the historical average of the last 6 invoices and asks Claude to narrate the comparison. That answers "is this invoice normal?" but not "what's the trend across all my invoices?" — seasonality, a consumption trend line, and an estimated savings potential all require statistical modeling (linear regression, month-over-month grouping) that's a natural fit for Python's numerical stack (`numpy`, `pandas`, `scipy`) rather than reimplementing regression and aggregation by hand in JavaScript.

This is also a deliberate demonstration of Python proficiency and of designing a polyglot architecture, both called out in the target role's requirements.

## Decision
Add `python-service/`, a small FastAPI microservice, alongside the existing Node.js backend and React frontend:

- **`analyzer.py`** — pure statistical logic: `calculate_trends(invoices)` builds a pandas DataFrame from a list of invoice dicts, fits a linear regression (`scipy.stats.linregress`) over consumption to derive `trend_direction`/`trend_percentage`, compares summer vs. winter monthly averages for `seasonality_detected`, and estimates `savings_potential_eur` from the excess consumption above the historical average.
- **`main.py`** — a thin FastAPI layer: `POST /analyze-trends` accepts a list of invoices as JSON and returns the computed trends; `GET /health` for liveness checks.
- **Backend integration**: `backend/services/analysisService.js` exports `fetchTrends()`, which queries all historical invoices from PostgreSQL and calls the Python service over HTTP. It's invoked in two places:
  - `POST /api/invoices/extract` (`backend/routes/invoices.js`), after saving the invoice and syncing to CRM, adding a `trends` field to the response.
  - A new `GET /api/invoices/trends` endpoint, so the Dashboard can show trend data without going through the upload flow.
- **Frontend**: `DashboardView.jsx` fetches `/api/invoices/trends` alongside `/api/invoices` and renders a "Trend Analysis" card — trend direction with an arrow icon, percentage change, a seasonality badge, the peak consumption month, and (when positive) an estimated savings figure highlighted in green.
- **Graceful degradation**: `fetchTrends()` wraps the HTTP call in try/catch. If the Python service is unreachable or errors, it logs a warning and returns `null` — the invoice extraction pipeline and the Dashboard both continue to function without trend data rather than failing the request.

## Rationale
- **Right tool for the job.** Linear regression, month grouping, and seasonal comparison are a few lines with `numpy`/`pandas`/`scipy`; doing the same in JavaScript means either hand-rolling regression math or adding a numerical dependency that doesn't exist for Node the way it does for Python.
- **Microservice pattern, not a rewrite.** The Node backend keeps owning extraction, per-invoice analysis, persistence, and CRM sync — the things it already does well. The Python service owns one thing: statistics over the full invoice history. Each service does what it's best at, and the boundary between them is a single HTTP call carrying plain JSON, not a shared codebase or database schema.
- **Graceful degradation over a hard dependency.** A statistics microservice being down should never mean invoice analysis is down. Modeling this the same way `crmService`'s sync-status tracking does (fail visibly in logs, keep the primary flow working) keeps EnergyBot's core value proposition — extract, analyze, save — decoupled from an optional enrichment.
- **Consistent with ADR 003's memory philosophy.** Trends are recomputed from the same PostgreSQL `invoices` table that already serves as the analysis agent's memory, rather than caching or duplicating invoice data inside the Python service.

## Production deployment
The root `Dockerfile` now packages both Python and Node services together:
- **Base image**: `python:3.12-alpine` (installs Node.js on top).
- **Build stages**: Frontend builds first, then Python dependencies and Node dependencies are installed in a single layer, finally both services' source code is copied in.
- **Entry point**: `docker-entrypoint.sh` starts the Python service on port 8000 in the background, then the Node backend on port 3000 in the foreground; both run inside the same container.
- **Timeout**: `fetchTrends()` now enforces a 10-second timeout on the HTTP call via `AbortController`, so a hung Python service never blocks invoice analysis.
- **Environment**: `STATS_SERVICE_URL` defaults to `http://localhost:8000` inside the container, requiring no additional Railway configuration beyond deploying the single built image.

## Trade-offs accepted
- **A second runtime in the container.** Running Python and Node together in one Docker image adds complexity over running just Node (larger image, more build layers, more processes to manage), but keeps operational complexity simple for Railway (one service, one port range, one deployment unit).
- **Network call on the hot path.** `fetchTrends()` adds one HTTP round-trip to `POST /api/invoices/extract`. Kept synchronous (matching ADR's existing pattern for CRM sync) for simplicity; the 10-second timeout bounds latency, but a slow Python service can still slow down invoice analysis.
- **No shared validation between services.** The invoice shape sent to Python (`period`, `consumption_kwh`, `total_cost`) is a hand-picked subset of the full invoice with no shared schema/types between Node and Python — acceptable at this scale, but would benefit from a shared JSON Schema or OpenAPI contract if the interface grows.
- **Both services in one process supervisor.** The shell script entry point (`docker-entrypoint.sh`) starts both services with basic process management (`wait`); if either service crashes, the container exits. A production deployment would benefit from a process supervisor (e.g., `supervisord`) with restart/logging policies, but for a portfolio project this is sufficient.

## Consequences
- `python-service/` is a standalone FastAPI app with its own `requirements.txt`; it is not part of the root `Dockerfile`/`railway.json` build yet and must be run separately (`python main.py`) for trend data to appear.
- `backend/services/analysisService.js` gains a `fetchTrends()` export and a `STATS_SERVICE_URL` environment variable (defaults to `http://localhost:8000`).
- `backend/routes/invoices.js` gains `GET /api/invoices/trends`; the `POST /api/invoices/extract` response gains a `trends` field.
- `frontend/src/api.js` gains `fetchTrends()`; `DashboardView.jsx` renders trend data when available and silently omits the section when the Python service hasn't returned data.
