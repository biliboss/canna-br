# Observability — canna-mcp / api / worker

Every MCP tool call, API request, and worker job emits a structured **span**.
Instrumentation is **env-gated** and **no-ops gracefully** when unconfigured —
nothing breaks if the env vars are absent.

## MCP tool spans (`apps/mcp/src/telemetry.ts`)

Each `tools/call` produces one span:

```json
{ "kind": "mcp.tool.span", "tool": "get_member_quota", "role": "DISPENSADOR",
  "associationId": "01H…", "latencyMs": 3, "ok": true, "startedAt": "…" }
```

`ok` is derived from BOTH a thrown error AND a returned `{ isError: true }`
(domain errors like `MEMBER_NOT_FOUND` / `INVALID_CPF` return `isError`, they do
not throw — so `ok: false` + `error: <CODE>` is recorded for them). Pre-handler
exits (`AUTH_FAILED`, `ROLE_INSUFFICIENT`) emit `ok: false` spans too.

### Sink selection (decided at first emit)

| Condition | Sink |
|---|---|
| `LANGFUSE_HOST` + `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` all set | Langfuse ingestion (`POST {HOST}/api/public/ingestion`, fire-and-forget) |
| otherwise | structured JSON line on **stderr** (always-on) |

The sink **always swallows its own errors** — telemetry can never break a tool
call or the test suite.

### Enable Langfuse in prod (deploy step)

Langfuse is already self-hosted at `langfuse.fonsecagabriel.com.br`. Set on the
MCP container (creds in the `langfuse-fonsecagabriel` envless project):

```sh
LANGFUSE_HOST=https://langfuse.fonsecagabriel.com.br
LANGFUSE_PUBLIC_KEY=pk-lf-…
LANGFUSE_SECRET_KEY=sk-lf-…
```

**Live smoke (deploy-time, not a card blocker):** after setting the vars, call
any tool against the live MCP host and confirm a trace named
`mcp.tool.<name>` appears in the Langfuse dashboard. The headless test
(`src/telemetry.spec.ts`) proves the instrumentation fires against a fake sink;
the live trace just confirms the HTTP envelope reaches Langfuse.

## 5xx / error visibility

- **MCP host** (`main.ts`): the per-request 500 catch emits a structured
  `mcp.http.5xx` error log (`level: "error"`, method/url/stack tags).
- **API** (`app.ts`): a Fastify `onResponse` hook emits one `api.request.span`
  per request (`level: "error"` for status ≥ 500).
- **Worker** (`worker.ts`): each job emits a `worker.job.span` (`level: "error"`
  on failure; errors re-throw so BullMQ retry/DLQ still fire).

## Sentry (wire-optional — TODO)

No Sentry DSN exists yet. Hook point is the `main.ts` 5xx catch block: set
`SENTRY_DSN` and add `@sentry/node` init there to forward errors. Until then the
structured stderr logs are the always-on error sink.

## Verifiability

```sh
pnpm --filter @canna/mcp test   # 99 passed (incl. telemetry.spec.ts span asserts)
```

`telemetry.spec.ts` drives a real `tools/call` over `InMemoryTransport` with an
in-memory fake sink and asserts a span with `{ tool, role, associationId,
latencyMs, ok }` was emitted — proving instrumentation without a live Langfuse.
