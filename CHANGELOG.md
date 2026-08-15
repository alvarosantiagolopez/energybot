# Changelog

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