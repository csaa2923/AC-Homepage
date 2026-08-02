# AI Concierge

`analyzeConciergeTrip` is an authenticated Firebase Callable Function for Admin V2.
It loads the customer record server-side and only sends a minimized allowlist to
OpenAI: trip details, aggregated travelers, preferences, program entries,
non-financial booking status, document status, publication state, and
rule-based Concierge Intelligence.

It excludes contacts, tokens, document contents and URLs, payment data, auth
data, and technical logs. Responses are validated structured suggestions only;
they are neither saved nor applied automatically.

Configure the secret before deploying:

```text
firebase functions:secrets:set OPENAI_API_KEY
```

Optionally set `OPENAI_MODEL` server-side to change the default model
(`gpt-4o-mini`). Do not deploy this function before the secret is configured.
