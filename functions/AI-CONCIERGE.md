# AI Concierge Advisor (Ops Ready 5.2)

`analyzeConciergeTrip` is an authenticated Firebase Callable Function for Admin V2.
It loads the customer record server-side and only sends a minimized allowlist to
OpenAI: trip details, traveler aggregates, preferences, program entries (with ids
and travel flags), non-financial booking status, document metadata, weather
summaries, publication state, rule-based Concierge Intelligence, and existing
customer-scoped AI tasks.

It excludes contacts, tokens, document contents and URLs, storage paths, payment
data, auth data, and technical logs. Responses are validated against Advisor
schema version 2 (`score`, findings, risks, wow moments, suggested tasks). They
are not saved automatically.

## Persistence

- Explicit save via `saveConciergeAnalysis` writes
  `customers/{customerId}/aiAnalyses/{analysisId}` with `schemaVersion: 2`.
- Auto tasks (`createMode: "auto"` and priority/severity rules) upsert
  `customers/{customerId}/aiTasks/{stableKey}` and mirror into
  `aiTaskInbox/{customerId}__{stableKey}`.
- Confirm tasks use `createConciergeAnalysisTask`.
- Status updates use `updateConciergeAnalysisItemStatus` (writes task index + inbox).
- History via `listConciergeAnalyses` (includes v1 adapter fields).
- Global inbox via `listConciergeAnalysisTasks` reads `aiTaskInbox` (no collectionGroup).

Legacy schema v1 analyses remain readable through an adapter.

## Secrets

```text
firebase functions:secrets:set OPENAI_API_KEY
```

Optionally set `OPENAI_MODEL` server-side (default `gpt-4o-mini`).
Do not deploy analyze before the secret is configured.

## Deploy order

1. Cloud Functions + Firestore rules
2. Frontend (Admin V2)
