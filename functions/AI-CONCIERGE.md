# AI Concierge Advisor (Ops Ready 6.6)

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

## Frontend Action Workspace architecture (Admin V2)

Shell lives in the AI task detail dialog (`admin-v2.js` + `admin-v2.css`).
Module registry and draft helpers live in `ai-task-action-workspace.js`
(`window.ACTAiTaskActionWorkspace`).

```text
Task detail dialog
  └─ Action Workspace region (#aiTaskActionWorkspace)
       ├─ Registry resolveModule(taskType)
       ├─ Module body (form or generic fallback)
       └─ Persist block (server save XOR local-only hint)
```

### Registry

| taskType | moduleId | Form | Server persist |
| --- | --- | --- | --- |
| `reserve_restaurant` | `reserve_restaurant` | yes | yes (`updateConciergeAnalysisTaskAction`) |
| `confirm_transfer` | `confirm_transfer` | yes | no (session draft only) |
| `confirm_booking` | `confirm_booking` | yes | no (session draft only) |
| other / unknown | `unknown` / generic | no | no |

Unknown `taskType` never fails silently: generic fallback lists target actions and
shows an explicit „Unbekannter Aufgabentyp“ message.

### Deep-Link

Supported hash:

```text
#tasks?task=<taskId>&workspace=1
```

Optional customer filter (id only, never customer name):

```text
#tasks?customer=<customerId>&task=<taskId>&workspace=1
```

Behaviour:

1. Load / wait for AI task inbox
2. Resolve task by `taskId` across loaded tasks
3. Open detail dialog; with `workspace=1|true|open` open the Action Workspace
4. Set customer filter from the task’s `customerId` when known
5. Invalid `taskId` → stay on tasks list with a clear warning (no stuck dialog)
6. Deep-link forces `open:true` on the draft **without** wiping other draft fields

### Drafts / UI-state persistence

- Keyed per `taskId` in `sessionStorage` (`act-ai-task-workspace-draft:<taskId>`)
- Stores form fields + `open` (workspace open/closed) per task
- No cross-task leak: switching tasks reads that task’s draft only
- Reload restores draft + open flag when the same task is opened again

Load priority when opening a task:

1. Server `actionWorkspace` (restaurant / server-capable modules)
2. Local `sessionStorage` draft
3. Defaults

A newer local draft may show as unsaved local changes; server remains source of
truth until „Arbeitsstand speichern“. No silent overwrite of newer server data.
No autosave-to-server on every keystroke.

### Status vs workStatus

| Field | UI label | Meaning | Values |
| --- | --- | --- | --- |
| `status` | Task-Status | Inbox lifecycle | Offen / Erledigt / Verworfen (`open` \| `completed` \| `dismissed`) |
| `actionWorkspace.workStatus` | Arbeitsstand | Module work progress | see below |

Work-status labels (never mixed with Task-Status):

- Restaurant: Offen / Recherchiert / Angefragt / **Reserviert** / Blockiert
- Transfer: Offen / Recherchiert / Angefragt / **Bestätigt** / Blockiert
- Booking: Offen / Angefragt / **Bestätigt** / **Storniert** / Blockiert

`workStatus` never auto-completes the AI task. Completing remains an explicit
`updateConciergeAnalysisItemStatus` action.

### Module persistence summary

| Module | Persist |
| --- | --- |
| Restaurant | Local draft + server via `updateConciergeAnalysisTaskAction` |
| Transfer | Local session draft only (Ops Ready 6.5/6.6) |
| Booking | Local session draft only (Ops Ready 6.5/6.6) |

Transfer/Booking may open/create a booking through the existing booking editor;
that does not persist Action Workspace fields to the backend.

## Action Workspace schema (server)

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

Server `workStatus` whitelist remains restaurant-compatible (`reserved`). Transfer
`confirmed` / booking `cancelled` are client draft values until a future backend
extension; they must not be sent through `updateConciergeAnalysisTaskAction` today.

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

## Frontend UX contracts (6.6)

- A11y: `aria-expanded` / `aria-controls` on workspace toggle; dialog focus trap;
  Escape closes; focus returns to the opening control; labels + `aria-live` on
  status/error messages; ≥44px touch targets
- Mobile: bottom sheet ≤ ~90dvh; body scrolls; footer always reachable; single-column
  forms; no horizontal overflow; long URLs/names wrap
- Buttons: primary / soft secondary / danger destructive; disabled + busy states
- Errors: generic user-facing messages; no tokens or customer PII in console logs

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
