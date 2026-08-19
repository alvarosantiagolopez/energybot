# ADR 009: Replace the "if anomaly then email" rule with an internal prioritization agent

## Status
Accepted

## Context
Until now, EnergyBot's only agentic action was a single rule: `if analysisResult.anomalies then sendAnomalyAlert()`. That rule works as a demo of "the agent acts, not just reports" (ADR 008), but it does not reflect how an internal team would actually want to be alerted, because a binary anomaly flag collapses several different, genuinely important questions into one boolean:

- **A billing error and a real consumption increase look identical to a threshold check**, but they need completely different responses. A sudden, isolated 80% spike inconsistent with a client's usage history is very likely a meter or billing mistake — worth flagging for someone to manually check the invoice. A gradual, sustained increase across several invoices is a real change in the client's operations — worth monitoring or a conversation, not an urgent escalation.
- **A rule can't weigh client value against anomaly severity.** A small client with a huge percentage deviation and a large client with a moderate deviation both "exceed 20%" identically to a threshold check, but an account team has a limited amount of attention and should look at the large client first if it also represents significant revenue at risk — unless the small client's anomaly is severe enough to suggest a billing error that will damage the relationship either way. A single `if` statement cannot make that trade-off; it can only ever act on one signal at a time.
- **Recurring anomalies for the same client need different handling than a first-time anomaly.** A client that has been flagged three times before might have a persistent billing issue worth escalating harder, or might simply have naturally volatile usage that shouldn't be re-flagged every cycle. The old rule had no memory of this at all — every invoice was evaluated in isolation.

None of this is expressible as a threshold. It requires reasoning over multiple signals at once and explaining the trade-off, which is exactly the kind of judgment call an LLM is suited for and a fixed rule is not.

## Decision
Add `backend/services/agentService.js` with a single function, `prioritizeAndAct(invoiceData, analysisResult, historicalInvoices, crmContact)`:

- **Builds a context prompt for Claude** (`claude-sonnet-4-6`) containing four categories of signal:
  1. **Current invoice** — consumption, cost, and the anomaly details already computed by `analysisService.js`.
  2. **Historical pattern** — how many prior invoices exist for this client, their consumption history, and how many of those invoices were already flagged as anomalies (i.e., has this happened before for this specific client?).
  3. **Client value** — total historical spend across all their invoices, used as a proxy for business priority.
  4. **Anomaly type reasoning** — the prompt explicitly asks Claude to infer whether the anomaly looks like a billing error (sudden, isolated, inconsistent with usage pattern), a genuine consumption increase (gradual trend across invoices), a seasonal pattern, or unclear.
- **Explicitly asks Claude to weigh conflicting signals** rather than apply a threshold — the prompt states the "small client with a huge anomaly vs. large client with a moderate anomaly" trade-off directly, so the model reasons about it rather than defaulting to whichever signal it saw first.
- **Returns structured JSON** (`priority`, `reasoning`, `likelyRootCause`, `suggestedAction`, `confidence`) via `output_config.format`, so the decision is machine-actionable and the reasoning is always present, never optional.
- **Executes the decision**: `flag_for_manual_review` updates `crm_contacts.last_sync_status` to `'needs_review'`; `send_email_alert` calls the existing `emailService.sendAnomalyAlert()`; `monitor_next_cycle` and `no_action_needed` take no external action beyond logging the reasoning server-side.
- **Integration**: `backend/routes/invoices.js` now fetches all prior invoices for the company, calls `prioritizeAndAct()` after CRM sync (passing the CRM contact record so the agent can act on it), and includes the full decision object as `agentDecision` in the API response, replacing the old direct `emailAlert` field.
- **Frontend**: `ResultView.jsx` replaces the old "alert email sent" badge with an "Internal Agent Decision" card showing a color-coded priority badge (high=red, medium=orange, low=yellow, none=gray), the detected root cause, the full reasoning text prominently, the action actually taken, and the agent's confidence level.

## Rationale
- **Why showing the reasoning matters**: internal team members need to *trust and verify* the agent's prioritization before they act on it, not just receive a binary alert. An account manager who sees "high priority — billing error suspected: this client's consumption jumped 85% in one cycle with no prior anomaly history, and they represent €4,200 in historical spend, higher than a threshold-based flag would suggest" can immediately decide what to do. A silent `needs_review` flag with no explanation would just move the manual-review burden from "decide if this matters" to "figure out why the system thinks this matters" — no time is actually saved, and nobody would trust the flag enough to act on it without re-deriving the reasoning themselves.
- **Why this is the Internal Platforms & Data layer, not customer-facing**: this agent is invisible to us end customers — they never see a priority score or a root-cause label. Its entire purpose is to let our own team scale their attention across many clients without reviewing every single invoice by hand. This is the same distinction as an internal fraud-triage queue versus a customer-facing dashboard: the audience is the business operating the product, not the business's customers.
- **Why one Claude call instead of a rules engine with more thresholds**: the signals genuinely interact (severity × recurrence × client value × inferred cause), and hand-coding every combination as nested conditionals would require encoding judgment calls our team would rather review as prose than as an opaque scoring formula. A model call also generalizes to signals not enumerated in the original threshold logic without a code change.
- **Why `flag_for_manual_review` writes to CRM `last_sync_status` rather than a new column**: the existing `crm_contacts.last_sync_status` field is already the place the CRM view surfaces contact state (`synced`, `pending`, etc.), so `needs_review` slots into the same UI surface without a schema migration.

## In production
- `historicalInvoices` and CRM lookups are currently sequential per-request queries; at scale this would move to a background job so invoice upload latency doesn't include the full agent reasoning pass.
- The agent's decisions could themselves be logged to a dedicated `agent_decisions` table (rather than only the latest decision being visible via the API response) so we could audit prioritization accuracy over time and retrain/adjust the prompt based on which flags the team actually acted on.
- `suggestedAction: flag_for_manual_review` could route to a real queueing system (e.g., a Linear/Jira ticket or a Slack message to the account owner) instead of a CRM status field.
- Client value could incorporate contract type and churn risk signals from a real CRM, not just summed historical invoice cost.

## Trade-offs accepted
- **One Claude call per invoice** adds latency and cost to the upload pipeline, on top of the existing extraction and analysis calls. Accepted because the reasoning quality this buys — explainable, multi-signal prioritization — is the point of the feature, and it is wrapped in a try/catch so a failed decision degrades to `no_action_needed` rather than failing the whole request.
- **No persistence of past agent decisions** beyond what's returned in the API response for that request; the agent re-derives the historical pattern context from the `invoices` table each time rather than reading its own prior verdicts.
- **`historicalInvoices` and CRM value both derive from EnergyBot's own database**, which is itself simulated demo data — a production deployment would pull true lifetime value from a real CRM/billing system.

## Consequences
- `backend/services/agentService.js` owns all prioritization and action-taking logic; `backend/routes/invoices.js` no longer calls `emailService.js` directly — it only ever goes through `agentService.prioritizeAndAct()`, which decides whether email is the right action.
- The API response's `emailAlert` field is removed and replaced by `agentDecision` (containing `priority`, `reasoning`, `likelyRootCause`, `suggestedAction`, `confidence`, `actionTaken`).
- Adding a new possible action (e.g., Slack notification) means adding a `case` to the `switch` in `prioritizeAndAct()` and a new value to the `suggestedAction` enum in `DECISION_SCHEMA` — the route and frontend don't need to change.
