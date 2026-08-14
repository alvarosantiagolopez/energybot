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
└── CLAUDE.md

## What's done
- [x] Project structure
- [x] Backend server with Fastify
- [x] PostgreSQL connection and invoices table
- [x] Frontend with Vite + React
- [x] Claude extraction service
- [ ] Analysis agent with memory
- [ ] Frontend UI
- [ ] Deploy

## Key decisions made
- Use Claude API directly (with native PDF support + structured outputs) for invoice extraction instead of a traditional OCR library. See docs/decisions/002-claude-api-for-extraction.md.


## API Key
Uses ANTHROPIC_API_KEY from .env file

## Database
PostgreSQL Railway

## Code Standards
- Conventional commits: feat/fix/docs/chore
- Comments in English
- Create ADR in docs/decisions/ for every architectural decision
- Update CHANGELOG.md when features are complete

When you finish, update CLAUDE.md:
- Mark completed tasks with [x]
- Add any new decisions made to the "Key decisions made" section