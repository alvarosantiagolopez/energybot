# EnergyBot — AI Energy Invoice Analyzer

## Project Goal
Portfolio project for Product Engineer.
Demonstrates: automation workflows, AI decision-making, memory systems.

## Project Philosophy
This is a portfolio project demonstrating Product Engineer thinking:
- Every decision must be documented and justified
- Workflow visibility is as important as functionality
- Memory and context management are core features, not afterthoughts

## Stack
- Backend: Node.js + Fastify
- Frontend: React
- Database: PostgreSQL
- AI: Claude API (claude-sonnet-4-6)
- Statistics: Python + FastAPI microservice (numpy, pandas, scipy)
- Deploy: Railway

## Project Structure
energybot/
├── backend/
│   ├── server.js
│   ├── routes/invoices.js
│   ├── routes/crm.js
│   ├── services/claudeService.js
│   ├── services/analysisService.js
│   ├── services/crmService.js
│   └── db/connection.js
├── frontend/
│   └── src/
├── python-service/
│   ├── main.py
│   ├── analyzer.py
│   └── requirements.txt
├── Dockerfile
├── railway.json
└── CLAUDE.md

## What's done
- [x] Project structure
- [x] Backend server with Fastify
- [x] PostgreSQL connection and invoices table
- [x] Frontend with Vite + React
- [x] Claude extraction service
- [x] Analysis agent with memory
- [x] Frontend UI
- [x] Deploy (Docker + Railway config)
- [x] Dashboard view with charts + navigation/routing polish
- [x] Simulated CRM integration (auto-sync on invoice analysis + CRM view)
- [x] Database seed script with realistic demo data (6 invoices, 3 companies, 1 anomaly)
- [x] Python microservice for statistical trend analysis (linear regression, seasonality, savings potential) + Dashboard "Trend Analysis" section

## Key decisions made
- Use Claude API directly (with native PDF support + structured outputs) for invoice extraction instead of a traditional OCR library. See docs/decisions/002-claude-api-for-extraction.md.
- Use PostgreSQL's `invoices` table as the agent's memory layer for historical comparison (last 6 invoices), instead of in-process/ephemeral memory. See docs/decisions/003-memory-through-postgresql.md.
- The `/api/invoices/extract` endpoint runs the whole pipeline (extract → history lookup → analyze → save) as a single synchronous request rather than streaming progress via SSE/WebSockets. The frontend simulates the 5 workflow steps client-side with a timer while the request is in flight, so the UI stays simple (plain fetch, no streaming infra) while still giving the user visibility into the pipeline stages.
- ~~Deploy backend and frontend as two separate Dockerized Railway services, with nginx proxying `/api/*` to the backend.~~ Superseded — see docs/decisions/004-railway-deployment-with-docker.md.
- Deploy as a single Railway service: the Fastify backend serves the built React frontend as static files (`@fastify/static`, active only when `NODE_ENV=production`) instead of running a separate nginx service. One Dockerfile builds the frontend then copies it into the backend image. See docs/decisions/005-single-service-static-frontend.md.
- Use `react-router-dom` for real client-side routing (`/dashboard`, `/upload`, `/history`) instead of the previous `useState`-based tab switcher, now that there are 3 distinct views with Dashboard as the home page. Dashboard reuses the existing `GET /api/invoices` endpoint (no new backend endpoint) and aggregates totals/averages/charts client-side, keeping the backend API surface unchanged.
- Use `recharts` for the Dashboard's consumption/cost line charts — lightweight, React-native charting without a heavier dependency like D3 directly.
- Simulate the CRM integration (find-or-create `crm_contacts` by company name, automatic sync inline after invoice save, sync-status tracking) against the project's own PostgreSQL database instead of a real HubSpot/Salesforce sandbox, since no external CRM account is available for this portfolio project. The pattern (data mapping, automatic sync, status tracking) maps directly to a real CRM API integration. See docs/decisions/006-simulated-crm-integration.md.
- Add a separate Python + FastAPI microservice (`python-service/`) for statistical trend analysis (linear regression, seasonality detection, savings potential) instead of implementing the math in JavaScript, since numpy/pandas/scipy are the natural fit for this kind of analysis and it demonstrates a polyglot microservice architecture. The Node backend calls it over HTTP (`STATS_SERVICE_URL`, defaults to `http://localhost:8000`) with a 10-second timeout and fails gracefully (logs a warning, continues without trend data) if the service is unavailable — invoice analysis never depends on it being up. The production `Dockerfile` packages both Python and Node services in a single container using `docker-entrypoint.sh` to start both processes, ready for deployment to Railway as a single unit. See docs/decisions/007-python-microservice-for-statistics.md.


## API Key
Uses ANTHROPIC_API_KEY from .env file

## Database
PostgreSQL Railway

## Code Standards
- Conventional commits: feat/fix/docs/chore
- Comments in English
- Create ADR in docs/decisions/ for every architectural decision
- Update CHANGELOG.md when features are complete

## Development Commands

**Backend** (from `backend/` directory):
```bash
npm run dev:clean    # Kill any running node processes and start backend
npm run dev          # Start backend (if no conflicts)
npm start            # Start backend in production mode
npm run migrate      # Run database migrations (creates tables)
npm run seed         # Seed database with 6 realistic demo invoices
```

**Frontend** (from `frontend/` directory):
```bash
npm run dev          # Start frontend
npm run build        # Build for production
```

**Python statistics service** (from `python-service/` directory):
```bash
pip install -r requirements.txt   # Install dependencies (first time)
python main.py                    # Start service on port 8000
```

When you finish, update CLAUDE.md:
- Mark completed tasks with [x]
- Add any new decisions made to the "Key decisions made" section