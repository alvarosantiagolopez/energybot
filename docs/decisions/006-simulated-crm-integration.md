# ADR 006: Simulate a CRM integration instead of connecting to a real HubSpot/Salesforce account

## Status
Accepted

## Context
EnergyBot has no natural CRM touchpoint on its own — it analyzes energy invoices, not sales pipelines — so demonstrating this skill requires deliberately adding an integration surface.

A real integration would need a live HubSpot or Salesforce account, OAuth credentials, and a sandbox environment, none of which are available for a solo portfolio project. The choice was between skipping the CRM requirement entirely, or simulating the integration data model and sync pattern against EnergyBot's own PostgreSQL database.

## Decision
Add a `crm_contacts` table and a `crmService.js` that simulates what a CRM sync would do, without calling any external API:

- **Data model**: `crm_contacts` mirrors what a CRM contact/company record would track — `company_name`, `contact_email`, a foreign key to the triggering `last_invoice_id`, `last_consumption_kwh`, `anomaly_status`, `last_sync_status`, and `last_synced_at`.
- **Find-or-create by company**: `syncInvoiceToCRM()` looks up an existing contact by `company_name`; if found, it updates the record in place, otherwise it creates one. This is the same lookup pattern a real integration uses (match on a business key like company name, email, or an external CRM id) instead of blindly inserting duplicates.
- **Automatic sync on new data**: the sync runs inline, automatically, at the end of `POST /api/invoices/extract` — right after `saveInvoice()` — with no separate action required from the user. This models the "keep CRM records current as new data arrives" pattern real integrations implement, typically via a webhook or a scheduled job.
- **Status tracking**: `last_sync_status` (`pending` / `synced` / `failed`) and `last_synced_at` give visibility into whether and when each contact was last synced — the same operational visibility a real CRM integration's logs or sync dashboard would need to provide.
- The frontend surfaces this with a "CRM Sync" view (`GET /api/crm/contacts`) listing all contacts and their status, and a "✓ Synced with CRM" badge on the invoice result screen confirming the sync happened automatically.

## Rationale
- **The integration pattern is what's being demonstrated, not the specific vendor SDK.** Find-or-create by a business key, automatic sync on new data, and sync-status tracking are the same three concerns whether the target is HubSpot, Salesforce, or any other CRM — only the HTTP client and auth scheme change.
- **No external account access.** A real HubSpot/Salesforce sandbox requires an account this project doesn't have. Simulating the data model against the project's existing PostgreSQL database keeps the demonstration self-contained and runnable without external credentials.
- **Consistent with ADR 003's approach to memory.** This project already treats PostgreSQL as a durable, inspectable store for the analysis agent's memory rather than hiding logic behind an opaque cache. Modeling the CRM the same way — a real table, real queries, visible in the UI — keeps that philosophy consistent.

## What would change for a production-ready integration
- `crmService.syncInvoiceToCRM()`'s find-or-create logic would call the real CRM's REST API (e.g. HubSpot's Contacts/Companies API, or Salesforce's SObject API) instead of querying `crm_contacts` directly. The `crm_contacts` table would become a local cache/mapping of `internal_company` → `external_crm_id`, not the system of record.
- Authentication would move from none (simulated) to OAuth2 with token refresh, stored per-connection rather than as a single shared credential.
- Sync would move from inline/synchronous (blocking the `POST /api/invoices/extract` response) to asynchronous: either a queued job so a slow or failing CRM call can't delay the invoice-analysis response, or reversed entirely to webhook-driven (the CRM notifies EnergyBot of contact changes) for bidirectional sync.
- `last_sync_status = 'failed'` would need a retry/backoff strategy and alerting, instead of silently recording the failure as it does today.

## Trade-offs accepted
- **No real external API call.** This ADR explicitly does not integrate a live CRM; the sync logic, while structurally identical to a real integration, operates entirely on local data.
- **Synchronous sync.** Running the sync inline keeps the demo simple (one request, one response including `crmSync`) but is not how a production integration would be architected — see above.

## Consequences
- `backend/services/crmService.js` owns all CRM sync logic; `backend/routes/crm.js` exposes it read-only via `GET /api/crm/contacts`.
- `backend/routes/invoices.js` calls `syncInvoiceToCRM()` automatically after every successful invoice analysis, with no opt-out — matching the "always keep CRM current" behavior a real integration would target.
- Migrating to a real CRM later is additive: swap the internals of `crmService.js` for real API calls without changing its exported function signatures, the `crm_contacts` schema (repurposed as a local mapping cache), or the frontend.
