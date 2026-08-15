# ADR 002: Use Claude API directly for invoice data extraction instead of a traditional OCR library

## Status
Accepted

## Context
EnergyBot needs to pull structured fields (company name, billing period, kWh consumption, total cost, cost per kWh, contract type) out of energy invoice PDFs. These invoices come from many different providers, each with its own layout, terminology, and formatting conventions.

Two broad approaches were considered:

1. **Traditional OCR + rules/regex** (e.g. Tesseract, pdf-parse + hand-written parsers)
2. **Claude API with native PDF support and structured outputs**

## Decision
Use the Claude API directly (model: `claude-sonnet-4-6`) to extract invoice data, using the native `document` content block for PDF input and `output_config.format` (structured outputs / JSON schema) to constrain the response shape.

## Rationale

- **No per-provider parser maintenance.** OCR + regex requires building and maintaining a parsing template per invoice layout. Every new utility company (or a layout change from an existing one) breaks the pipeline. Claude reads the invoice semantically, so it generalizes across providers without per-template code.
- **Native PDF understanding, not just text extraction.** Claude's document support reasons over the PDF's visual layout (tables, headers, multi-column sections), which plain OCR text extraction flattens and often garbles — invoices are exactly this kind of layout-dependent document.
- **Structured, validated output.** `output_config.format` with a JSON schema guarantees the response matches our expected shape (required fields, types), removing the need for fragile regex-based post-processing of OCR text to pull out numbers and dates.
- **Derived fields for free.** Claude can compute `costPerKwh` from `totalCost / consumptionKwh` when the invoice doesn't state it explicitly — logic that would otherwise be bespoke code per provider.
- **This is a portfolio project demonstrating AI decision-making**, per CLAUDE.md's project philosophy — using the Claude API as the core extraction mechanism is itself the point being demonstrated, not an implementation detail to abstract away.

## Trade-offs accepted

- **Cost per request** vs. free local OCR — acceptable at the expected volume for this project (a portfolio app, not high-throughput production).
- **External dependency / API availability** — extraction fails if the Claude API is unreachable or the key is invalid; this is surfaced to the client as a 502 rather than silently failing.
- **Less deterministic than rule-based parsing** — mitigated by using structured outputs (JSON schema) to constrain the response format, and by returning `null` for fields the model can't find rather than having it guess.

## Consequences
- `backend/services/claudeService.js` owns all Claude API interaction for extraction.
- `backend/routes/invoices.js` exposes `POST /api/invoices/extract`, which is extraction-only (no DB persistence yet — that's a separate, later task).
- If a future requirement needs offline/air-gapped extraction, a fallback OCR path could be added, but is out of scope for now.
