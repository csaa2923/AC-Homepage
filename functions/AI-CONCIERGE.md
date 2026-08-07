# AI Concierge Advisor (Ops Ready 6.4)

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
- Action Workspace updates use `updateConciergeAnalysisTaskAction` (writes
  `actionWorkspace` on task index + inbox only; never changes task `status` /
  lifecycle / completed / dismissed fields).
- History via `listConciergeAnalyses` (includes v1 adapter fields).
- Global inbox via `listConciergeAnalysisTasks` reads `aiTaskInbox` (no collectionGroup).

Legacy schema v1 analyses remain readable through an adapter.
Older tasks without `actionWorkspace` remain valid (additive field, no migration).

## Action Workspace schema

Optional object on AI tasks (`customers/{customerId}/aiTasks/{taskId}` and inbox mirror):

```text
actionWorkspace: {
  module: string,
  workStatus: "todo" | "researched" | "requested" | "reserved" | "blocked",
  note: string,
  research: {
    name: string,
    place: string,
    phone: string,
    website: string,   // http/https only
    mapsQuery: string
  },
  linkedBookingId: string,  // only when booking exists for this customer
  lastActionAt: timestamp,
  lastActionBy: string
}
```

Top-level companion fields written by the action callable:

- `updatedAt` / `updatedBy`
- `lastActionAt` / `lastActionBy`

### Status vs workStatus

| Field | Meaning | Values |
| --- | --- | --- |
| `status` | Task lifecycle (inbox / Erledigt / Verworfen) | `open` \| `completed` \| `dismissed` |
| `actionWorkspace.workStatus` | Operational work progress inside a module | `todo` \| `researched` \| `requested` \| `reserved` \| `blocked` |

`workStatus: "reserved"` does **not** auto-complete the task. Completing remains an
explicit `updateConciergeAnalysisItemStatus` action.

## Callable: `updateConciergeAnalysisTaskAction`

Region: `europe-west1` (same as other AI callables).

Input:

```text
{
  customerId: string,
  taskId: string,
  actionWorkspace: object
}
```

Server checks:

- Auth required; role `admin` or `owner` only
- `customerId` / `taskId` valid; customer exists
- Task exists under `customers/{customerId}/aiTasks/{taskId}`
- Rejects cross-customer task ownership mismatches
- `workStatus` whitelist
- String length limits; website only `http`/`https` (`javascript:` / `data:` blocked)
- `linkedBookingId` accepted only if `bookings/{id}` exists and `customerId` matches
- Unknown fields are not copied through (allowlisted normalize)

Writes only:

1. `customers/{customerId}/aiTasks/{taskId}` → `actionWorkspace`, `updatedAt`/`updatedBy`, `lastActionAt`/`lastActionBy`
2. `aiTaskInbox/{customerId}__{taskId}` → same action fields (status/lifecycle unchanged)

Client access is Callable-only (no direct client writes to `aiTasks`).

## Client load / draft rules

Priority when opening a task:

1. Server `actionWorkspace`
2. Local `sessionStorage` draft
3. Defaults

Local drafts may carry `updatedAt`. A newer local draft is shown as unsaved local
changes; server remains source of truth until an explicit „Arbeitsstand speichern“.
No silent overwrite of newer server data. No autosave-to-server on every keystroke.

## Secrets

```text
firebase functions:secrets:set OPENAI_API_KEY
```

Optionally set `OPENAI_MODEL` server-side (default `gpt-4o-mini`).
Do not deploy analyze before the secret is configured.

## Deploy order

1. Cloud Functions (`updateConciergeAnalysisTaskAction` + existing AI callables)
2. Frontend (Admin V2: `firebase-service.js`, `ai-task-action-workspace.js`, `admin-v2.*`)

No Firestore rules change required while AI task writes remain Callable-only.
