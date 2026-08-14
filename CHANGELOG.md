# Changelog

## [1.0.0] 14-08-2026

### Added
- Claude extraction service (`backend/services/claudeService.js`): extracts structured invoice data (company, billing period, kWh consumption, total cost, cost per kWh, contract type) from a PDF using the Claude API's native document support and structured outputs.
- `POST /api/invoices/extract` endpoint (`backend/routes/invoices.js`): accepts a multipart PDF upload, runs extraction, and returns the parsed JSON. Extraction only — no database persistence yet.