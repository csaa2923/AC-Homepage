# AI Concierge Advisor (Ops Ready 6.9)

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
| `upload_document` | `upload_document` | yes | yes (`updateConciergeAnalysisTaskAction`) |
| `upload_ticket` | `upload_ticket` | yes | yes (`updateConciergeAnalysisTaskAction`) |
| `check_voucher` | `check_voucher` | yes | yes (`updateConciergeAnalysisTaskAction`) |
| `add_navigation` | `add_navigation` | yes | yes (`updateConciergeAnalysisTaskAction`, Ops Ready 6.8b) |
| `prepare_weather_alternative` | `prepare_weather_alternative` | yes | yes (`updateConciergeAnalysisTaskAction`, Ops Ready 6.8b) |
| `reschedule_program` | `reschedule_program` | yes | yes (`updateConciergeAnalysisTaskAction`, Ops Ready 6.8b) |
| `complete_customer_data` | `complete_customer_data` | yes | yes (`updateConciergeAnalysisTaskAction`, Ops Ready 6.9) |
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

1. Server `actionWorkspace` (restaurant / document / ticket / voucher)
2. Local `sessionStorage` draft only when newer than `lastActionAt` and content differs
3. Defaults

A newer local draft may show as unsaved local changes; server remains source of
truth until „Arbeitsstand speichern“. After a successful save the local draft is
updated from the server response. No silent overwrite of newer server data.
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
- Document / Ticket (`documentWorkStatus`): Fehlt / Angefragt / Erhalten / **Geprüft** / Blockiert
- Voucher (`voucherStatus`): Ausstehend / **Gültig** / Unvollständig / Ungültig / Blockiert
- Navigation (`programWorkStatus`): Offen / Recherchiert / **Vorbereitet** / **Geprüft** / Blockiert
- Wetter-Alternative (`programWorkStatus`): Offen / Recherchiert / Vorbereitet / **Bestätigt** / Blockiert
- Verschieben (`programWorkStatus`): Offen / Geprüft / Vorbereitet / **Bestätigt** / Blockiert
- Kundendaten (`customerDataWorkStatus`): Offen / Kontaktiert / Wartet / Erhalten / Geprüft / **Vollständig** / Blockiert

Operational document/voucher/program/customer-data statuses must **not** be written into server
`actionWorkspace.workStatus` (restaurant whitelist). Completing remains an explicit
`updateConciergeAnalysisItemStatus` action.

### Module persistence summary

| Module | Persist |
| --- | --- |
| Restaurant | Local draft + server via `updateConciergeAnalysisTaskAction` |
| Transfer | Local session draft only (Ops Ready 6.5/6.6) |
| Booking | Local session draft only (Ops Ready 6.5/6.6) |
| Document / Ticket / Voucher | Local draft + server via `updateConciergeAnalysisTaskAction` (Ops Ready 6.7b) |
| Navigation / Wetter-Alternative / Verschieben | Local draft + server via `updateConciergeAnalysisTaskAction` (Ops Ready 6.8b) |
| Kundendaten (`complete_customer_data`) | Local draft + server via `updateConciergeAnalysisTaskAction` (Ops Ready 6.9) |

Transfer/Booking may open/create a booking through the existing booking editor;
that does not persist Action Workspace fields to the backend.

Document / Ticket / Voucher reuse existing Admin V2 document open/upload
(`ACTFirebaseStorage.uploadCustomerDocument` + `saveDraftCustomer`). On successful
upload the real `documentId` is stored as `linkedDocumentId` (local draft; can be
persisted via the action callable). Task `status` is never auto-completed when
document/voucher work status changes.

### Document fields (additive, server + local)

```text
documentTitle, documentKind, provider, referenceNumber, documentDate,
documentWorkStatus, voucherStatus, linkedDocumentId, note
```

Whitelists:

- `documentWorkStatus`: `missing` | `requested` | `received` | `checked` | `blocked`
- `voucherStatus`: `pending` | `valid` | `incomplete` | `invalid` | `blocked`

`linkedDocumentId` is accepted only when the document exists on the same
customer record (`customers/{customerId}.documents[]`). Foreign or missing IDs
are rejected. Storage paths / tokens / share URLs are never copied.

Server `workStatus` stays restaurant-compatible (`todo` | `researched` |
`requested` | `reserved` | `blocked`). Document/voucher progress uses the
dedicated fields above — never auto-sets task `status` to `completed` /
`dismissed`.

### Program / Navigation fields (additive, server + local — Ops Ready 6.8b)

```text
navigationStart, navigationDestination, navigationQuery, navigationNote,
alternativeTitle, alternativePlace, alternativeTime, linkedAlternativeProgramItemId,
proposedDate, proposedTime, rescheduleReason, programWorkStatus, note
```

`programWorkStatus` whitelist (union across navigation / weather / reschedule):

`todo` | `researched` | `prepared` | `reviewed` | `confirmed` | `checked` | `blocked`

Server `workStatus` stays restaurant-compatible (`todo` for these modules).
`prepared` / `reviewed` / `confirmed` never auto-set task `status` to `completed` /
`dismissed`.

`linkedAlternativeProgramItemId` is accepted only when the program item exists on the
same customer (`customers/{customerId}.program[].items[]` with real `id` /
`programItemId` / `stableId`). Temporary placeholders (`program-<timestamp>`,
`dayIndex-itemIndex`) are rejected. Missing linked alternatives show a clear UI hint.

`proposedDate` / `proposedTime` are workspace suggestions only — they never mutate
the real program document or publication. Real changes remain a conscious
Programmeditor action.

Navigation fields are plain text (start / destination / query / note) with length
limits; scheme URLs (`javascript:`, `data:`, …) are stripped. Live Maps/GPX/KML
links continue to come from the program item via travel helpers, not from
`actionWorkspace`.

Reuse:

- Open-Target: `resolveProgramItemTarget` / program editor focus
- Travel: `ACTTravelActionsLibrary.programItemActions` (Maps, Navigation, GPX, KML)
- Program editor: `startProgramEdit`, seeded alternative create, no auto publish

### Customer data fields (additive, server + local — Ops Ready 6.9)

```text
customerDataWorkStatus, customerDataNote, missingDataItems, note
```

`customerDataWorkStatus` whitelist:

`todo` | `contacted` | `waiting` | `received` | `reviewed` | `complete` | `blocked`

Server `workStatus` stays restaurant-compatible (`todo` for this module).
`complete` / `blocked` never auto-set task `status` to `completed` / `dismissed`.

`missingDataItems` is an optional list of known keys only:

`contact` | `phone` | `email` | `arrival` | `departure` | `travellers` |
`children` | `trip_dates` | `trip_name` | `region` | `requirements`

Keys are derived from real customer/trip emptiness (and known insight ids such as
`arrival-details-missing`). Free-form AI object graphs are never persisted.

**AI task ≠ workspace work status ≠ real customer data.**

The workspace stores operational progress only. It must **not** copy:

- full customer objects
- phone / email / address / traveller lists as workspace copies
- tokens, share links, storage paths

Live contact display and call/mail/WhatsApp actions read the current customer
record at render time. WhatsApp uses the existing
`ACTAdminV2Communication` helpers only when a valid number exists.

Real customer/trip/traveller edits go exclusively through existing Admin V2
editors (`startCustomerEdit`, `startTripEdit`, optionally `startConciergeEdit`)
after the workspace draft is saved locally. Soft open-targets
(customer / trip / concierge) remain tab navigation and are not worsened.

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
  documentTitle: string,
  documentKind: string,
  provider: string,
  referenceNumber: string,
  documentDate: string,
  documentWorkStatus: "missing" | "requested" | "received" | "checked" | "blocked" | "",
  voucherStatus: "pending" | "valid" | "incomplete" | "invalid" | "blocked" | "",
  linkedDocumentId: string,  // only when document exists for this customer
  navigationStart: string,
  navigationDestination: string,
  navigationQuery: string,
  navigationNote: string,
  alternativeTitle: string,
  alternativePlace: string,
  alternativeTime: string,
  linkedAlternativeProgramItemId: string,  // only when program item exists for this customer
  proposedDate: string,   // suggestion only — does not mutate program
  proposedTime: string,   // suggestion only — does not mutate program
  rescheduleReason: string,
  programWorkStatus: "todo" | "researched" | "prepared" | "reviewed" | "confirmed" | "checked" | "blocked" | "",
  customerDataWorkStatus: "todo" | "contacted" | "waiting" | "received" | "reviewed" | "complete" | "blocked" | "",
  customerDataNote: string,
  missingDataItems: string[],  // known keys only
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

Older restaurant-/document-only `actionWorkspace` records remain valid (additive fields).

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
- `workStatus` whitelist (restaurant-compatible)
- `documentWorkStatus` / `voucherStatus` / `programWorkStatus` whitelists when set
- String length limits; website only `http`/`https` (`javascript:` / `data:` blocked)
- Navigation/program text fields strip dangerous schemes
- `linkedBookingId` accepted only if `bookings/{id}` exists and `customerId` matches
- `linkedDocumentId` accepted only if document exists on the same customer
- `linkedAlternativeProgramItemId` accepted only if program item exists on the same customer
- Unknown fields are not copied through (allowlisted normalize); no tokens /
  storage paths / share URLs
- Never mutates program `date`/`time` or task `status`/`lifecycle`

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
