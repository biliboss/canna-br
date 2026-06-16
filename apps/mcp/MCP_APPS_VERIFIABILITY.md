# MCP-Apps Verifiability Report (canna-br)

> Authored 2026-06-16 for backlog card `mcp-apps-verifiability`. Answers: *where do the
> widgets render in production, how verifiable is each by Claude Code today, and what is
> the gap to an automated e2e harness?* Premise: [[feedback-test-in-production]] — verification
> runs against PRODUCTION, never mock.

## 1. Confirmed production surfaces (probed 2026-06-16)

| Host | Status | Role |
|---|---|---|
| `https://mcp.canna.fonsecagabriel.com.br` | `/health` 200, `/` 500 | **LIVE MCP server** (StreamableHTTP, stateless, per-request transport). The 500 on `/` with no MCP handshake is expected. **This is the harness target.** |
| `https://webui.canna.fonsecagabriel.com.br` | 200 | Open WebUI v0.9.6 — MCP **tool-server** consumer only. |
| `https://app.cannabr.org` | 200 | Open WebUI on the new domain (migration in progress). |
| `https://mcp.cannabr.org`, `https://api.cannabr.org` | TLS error | No cert issued yet — NOT usable. |

## 2. The root-cause gap: no prod surface renders ext-apps widgets inline

Open WebUI v0.9.6 consumes the MCP server as **tool servers** (text results). It does **not**
implement the ext-apps / OpenAI-Apps-SDK `ui://` inline-iframe rendering. The Kamal deploy
(`ops/openwebui/kamal/deploy.yml`) has **zero** ext-apps render config — it is vanilla OWUI.

The only surface in the repo with a real `McpAppRenderer` (assistant-ui) is `apps/agent`
(Next.js) — and it is **NOT deployed** (excluded from the pnpm workspace, no Kamal role, blocked
by ADR-002 until v1.0). Therefore: **no production surface renders these widgets inline-in-chat
today.** That is the surface gap, and it is the structural reason the widgets were "untested".

What CAN be verified against prod today: the MCP server's wire contract (handshake, per-request
transport, `_meta["ui/resourceUri"]` slash-form, real read-model data) + the served HTML bundle
rendering when fed the host's postMessage envelope in a real browser. The harness covers exactly
that. It does **not** prove inline-render inside the prod chat surface — closing that requires
deploying `apps/agent` (or OWUI gaining ext-apps support).

## 3. Per-widget verifiability inventory

| Widget | Primary tool | Prod surface (server) | Inline-render surface | Level today | Gap to automated |
|---|---|---|---|---|---|
| `member-quota-card` | `get_member_quota` | mcp.canna.fonsecagabriel.com.br ✅ | none (OWUI text-only; apps/agent undeployed) | **automated** (this harness) | covered: protocol + bundle render + real data vs prod |
| `traceability-timeline` | `generate_traceability_report` | mcp.canna…✅ | none | manual (chrome one-off) | extend harness with a traceability test (same pattern) |
| `dispensation-form` | `draft_dispensation` | mcp.canna…✅ | none | manual | write-flow harness; mutates prod → needs sandbox member |
| `member-lifecycle-board` | `get_members_by_status` | mcp.canna…✅ | none | untested | NOTE: existing in-memory `qa-render-harness.ts` asserts this board ABSENT from resources/list, but registry.ts includes it in allManifests → that harness assertion is stale (tracked by the separate mcp-apps graceful-degrade card, blocker #4). Left untouched here. |

## 4. The harness (`pnpm test:e2e:prod`)

- `e2e/lib/mcp-prod-client.ts` — drives the live MCP server via the MCP SDK `Client` over
  `StreamableHTTPClientTransport`. `connect()` runs the real `initialize` +
  `notifications/initialized` handshake, exercising the stateless-per-request transport live-bug.
  Sends `x-canna-*` headers. Endpoint via `CANNA_MCP_URL` (prod default).
- `e2e/member-quota-card.e2e.ts` — three tests:
  1. **real data** — prod `get_member_quota` returns `remainingG` (numeric, === 23 for the seed member).
  2. **GUARD (anti-false-green)** — `tools/list` advertises `_meta["ui/resourceUri"]` in SLASH form.
  3. **inline render** — the prod-served bundle, fed the prod tool result via the host postMessage
     envelope, renders `#consumed` / `#cap` / `#title` with zero console errors.

### Env contract (all have prod defaults)
`CANNA_MCP_URL`, `CANNA_TEST_MEMBER_ID`, `CANNA_TEST_ASSOCIATION`, `CANNA_TEST_USER`,
`CANNA_TEST_ROLE`, `CANNA_EXPECTED_REMAINING_G` (23), `CANNA_EXPECTED_CONSUMED_G` (7).

### Seed requirement
The harness is **read-only** (`get_member_quota`) — it does not mutate the regulated registry.
It asserts against an idempotent seed member (`01HM0MEMBER000000000000001`, 30g/7g). **Green must
ensure this member exists in prod** (run `apps/mcp/scripts/qa-seed-postgres.ts` against the prod
`DATABASE_URL` once) or point the env at a real prod member with a known quota.

## 5. Proving the guard turns RED (for green)

The named guard: reintroduce the `_meta` dot-form bug in `apps/mcp/src/server.ts` `toToolListItem`
(`_meta: { ui: { resourceUri } }` instead of the flat `_meta["ui/resourceUri"]`), boot the MCP
server locally, then run `CANNA_MCP_URL=http://localhost:3001 pnpm test:e2e:prod`. Test #2 (GUARD)
must fail. This proves the harness catches the bug that silently kills inline render.

## 6. Pre-push gate hook

`pnpm test:e2e:prod` is a standalone root script, pluggable into the pre-push gate alongside
`pnpm validate` (see the quality-gates card). It requires chromium (`pnpm exec playwright install
chromium`) and prod reachability.
