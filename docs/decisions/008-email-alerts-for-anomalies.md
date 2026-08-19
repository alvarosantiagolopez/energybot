# ADR 008: Send automatic email alerts when an anomaly is detected

## Status
Accepted

## Context
Up to this point, EnergyBot's agent behavior stops at analysis: it extracts invoice data, compares it against history, flags anomalies, and writes recommendations — all read-only. Nothing external happens as a result of what the agent finds. A key part of what makes something an "agent" rather than a "report generator" is that it can act on its own conclusions, not just describe them.

Anomaly detection (`backend/services/analysisService.js`) already computes whether an invoice deviates from history by more than `ANOMALY_THRESHOLD_PCT`. That result was previously only surfaced in the API response and the UI. The natural next step is to have the agent take a real action when it detects something worth acting on: notify a human automatically.

## Decision
Add `backend/services/emailService.js` with a single function, `sendAnomalyAlert(invoiceData, analysisResult)`:

- **Conditional send**: only sends when `analysisResult.anomalies` is non-null. Returns `{ sent: false, reason: 'no anomalies' }` otherwise — no email is the default case, not an error case.
- **Fails gracefully**: if `RESEND_API_KEY` or `ALERT_EMAIL` isn't configured, or the Resend API call throws, it logs a warning and returns `{ sent: false, reason }` instead of throwing. Invoice analysis must never fail because the email provider is unavailable.
- **Content**: a clean HTML email with the company name, billing period, current vs. average consumption (with percent difference), the anomaly description, and the top recommendation — everything a human needs to act without opening EnergyBot.
- **Integration**: `backend/routes/invoices.js` calls `sendAnomalyAlert()` after the CRM sync step in `POST /api/invoices/extract`, and adds the result to the response as `emailAlert`.
- **Frontend**: `ResultView.jsx` shows a "📧 Alert email sent" badge next to the company name, and an additional note under the anomalies section, whenever `emailAlert.sent` is true.

## Rationale
- **Why automatic alerts matter**: this is the difference between an agent that analyzes and one that acts. Detecting a 30% consumption spike is only useful if someone finds out about it — an automatic alert closes that loop without requiring a human to check a dashboard.
- **Why Resend over SendGrid/Mailgun**: Resend has a simple, modern API (a single `emails.send()` call), a generous free tier (3,000 emails/month) with no credit card required to start, and first-class Node.js developer experience — all a good fit for a portfolio project that needs working email delivery with minimal setup friction.
- **Why inline rather than queued**: consistent with the existing pattern for CRM sync (ADR 006) — the email send happens synchronously as part of the same request, keeping the pipeline (extract → analyze → save → sync → alert) easy to follow in one place. Failure is isolated with try/catch in the route so a slow or failing email provider can't break the response.

## In production
- Alerts could be routed to Slack (via a webhook) or PagerDuty for on-call escalation, in addition to or instead of email.
- Recipients could be resolved dynamically from `crm_contacts` (e.g., the contact's own email) rather than a single static `ALERT_EMAIL`, so each company's anomalies notify the right stakeholder.
- High-severity or repeated anomalies could escalate differently (e.g., immediate page vs. a daily digest email) rather than a uniform one-alert-per-anomaly policy.

## Trade-offs accepted
- **Single static recipient.** `ALERT_EMAIL` is one address for all alerts; there's no per-company or per-contact routing yet.
- **Synchronous send on the request path.** A slow Resend API call adds latency to `POST /api/invoices/extract`, though it's wrapped in try/catch so it can't fail the request outright.
- **No retry on failure.** If the send fails, it's logged and reported in the response, but not retried or queued for a later attempt.

## Consequences
- `backend/services/emailService.js` owns all alerting logic; adding new channels (Slack, PagerDuty) means adding new service files with the same `sendXAlert(invoiceData, analysisResult)` shape, not modifying the route.
- `backend/routes/invoices.js` calls `sendAnomalyAlert()` unconditionally after CRM sync; the response gains an `emailAlert` field (`{ sent, emailId }` or `{ sent: false, reason }`).
- Requires `RESEND_API_KEY` and `ALERT_EMAIL` environment variables; both are optional at runtime (email alerting is simply skipped if unset), so existing deployments continue to work without configuration changes.
