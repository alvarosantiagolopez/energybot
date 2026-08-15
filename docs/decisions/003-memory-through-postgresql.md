# ADR 003: Use PostgreSQL as the agent's memory layer

## Status
Accepted

## Context
EnergyBot's analysis agent needs to compare a newly extracted invoice against the user's historical consumption and cost to detect anomalies and generate meaningful, personalized recommendations. This requires some form of persistent memory across invoice-processing runs — without it, every invoice would be analyzed in isolation, with no notion of "higher than usual" or "trending up."

Two broad approaches were considered:

1. **In-process/ephemeral memory** (e.g. keep recent invoices in a module-level array, or re-derive context by re-parsing all previously uploaded PDFs on each request)
2. **PostgreSQL as durable, queryable memory** — persist every extracted + analyzed invoice as a row, and query the last N rows to build historical context for the next analysis

## Decision
Use the existing PostgreSQL `invoices` table (`backend/db/schema.sql`) as the agent's memory store. `analysisService.analyzeInvoice()` queries the last 6 invoices (`ORDER BY created_at DESC LIMIT 6`) to compute historical averages (consumption, cost per kWh, total cost) before calling Claude, and `analysisService.saveInvoice()` persists the current invoice's extracted data and analysis back into the same table, extending the memory for future runs.

## Rationale

- **Durability across restarts and deploys.** In-process memory (e.g. an array in server state) is lost on every restart, which is unacceptable for a Railway-hosted app that redeploys frequently. PostgreSQL memory survives deploys, crashes, and scaling events.
- **Already the source of truth for invoice data.** The `invoices` table already stores every processed invoice (`raw_extracted_data`, `ai_analysis`, etc.) for display purposes. Reusing it as memory avoids maintaining a second, parallel store that could drift out of sync with what the user sees in the UI.
- **Queryable structure over unstructured recall.** Because history is stored in typed columns (`consumption_kwh`, `cost_per_kwh`, `total_cost`), computing averages and percentage deviations is a plain SQL aggregation — no need to re-parse PDFs or re-run extraction to reconstruct context.
- **Bounded, relevant context window.** Limiting the memory query to the last 6 invoices keeps the historical comparison focused on recent billing cycles (roughly the last half-year for monthly billing) rather than diluting the average with very old, possibly outdated tariff data.
- **This is a portfolio project demonstrating memory and context management as a core feature**, per CLAUDE.md's project philosophy. Using the database explicitly as the agent's memory — rather than hiding it behind an in-memory cache — makes the memory mechanism visible and inspectable, which is the point being demonstrated.

## Trade-offs accepted

- **No semantic/vector memory.** This approach only supports structured, numeric comparison (averages, percentage deltas), not semantic recall of past natural-language analyses or recommendations. Sufficient for the current use case (numeric anomaly detection), but would need a different mechanism (e.g. embeddings) if the agent needed to recall *why* a past anomaly happened.
- **Global history, not per-user.** The current schema has no user/account concept, so "last 6 invoices" means the last 6 in the whole table. This is acceptable for a single-tenant portfolio app but would need a `user_id` filter before this could support multiple households.
- **Cold start.** With fewer than 6 historical invoices (including zero), averages are computed over whatever is available, and the analysis explicitly states that historical data is limited or absent rather than fabricating a comparison.

## Consequences
- `backend/services/analysisService.js` owns all historical comparison logic and reads/writes the `invoices` table directly via `backend/db/connection.js`.
- Adding multi-user support later will require adding a `user_id` column and filtering the memory query by it.
- If richer memory (e.g. "remember what recommendation was given last time and whether the user acted on it") is needed later, it can be layered on top of the same table without changing the storage backend.
