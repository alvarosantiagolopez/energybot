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
- Deploy: Railway

## Project Structure
energybot/
├── backend/
│   ├── server.js
│   ├── routes/invoices.js
│   ├── services/claudeService.js
│   ├── services/analysisService.js
│   └── db/connection.js
├── frontend/
│   └── src/
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

## Key decisions made
- Use Claude API directly (with native PDF support + structured outputs) for invoice extraction instead of a traditional OCR library. See docs/decisions/002-claude-api-for-extraction.md.
- Use PostgreSQL's `invoices` table as the agent's memory layer for historical comparison (last 6 invoices), instead of in-process/ephemeral memory. See docs/decisions/003-memory-through-postgresql.md.
- The `/api/invoices/extract` endpoint runs the whole pipeline (extract → history lookup → analyze → save) as a single synchronous request rather than streaming progress via SSE/WebSockets. The frontend simulates the 5 workflow steps client-side with a timer while the request is in flight, so the UI stays simple (plain fetch, no streaming infra) while still giving the user visibility into the pipeline stages.
- ~~Deploy backend and frontend as two separate Dockerized Railway services, with nginx proxying `/api/*` to the backend.~~ Superseded — see docs/decisions/004-railway-deployment-with-docker.md.
- Deploy as a single Railway service: the Fastify backend serves the built React frontend as static files (`@fastify/static`, active only when `NODE_ENV=production`) instead of running a separate nginx service. One Dockerfile builds the frontend then copies it into the backend image. See docs/decisions/005-single-service-static-frontend.md.


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
```

**Frontend** (from `frontend/` directory):
```bash
npm run dev          # Start frontend
```

When you finish, update CLAUDE.md:
- Mark completed tasks with [x]
- Add any new decisions made to the "Key decisions made" section