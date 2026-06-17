/**
 * Telemetry for the canna-mcp host — env-gated, no-op when unconfigured.
 *
 * Every MCP tool call becomes a span: { tool, role, associationId, latencyMs,
 * ok } plus an optional `error` tag. Spans are pushed to a pluggable SINK.
 *
 * Default sink selection (at first emit):
 *   - LANGFUSE_HOST + LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY all set
 *       → Langfuse ingestion sink (best-effort HTTP POST, fire-and-forget).
 *   - otherwise → structured JSON line on stderr (always-on local visibility).
 *
 * The sink ALWAYS swallows its own errors — telemetry must never break a tool
 * call nor the 96 specs. Tests inject a fake in-memory sink via `setSink`.
 *
 * Live Langfuse smoke (trace shows up in the dashboard) is a DEPLOY step; the
 * card is provable headless against the fake sink. See README in apps/mcp.
 */

export interface ToolSpan {
  readonly tool: string;
  readonly role: string;
  readonly associationId: string;
  readonly latencyMs: number;
  readonly ok: boolean;
  /** Domain error code or thrown message when ok === false. */
  readonly error?: string;
  readonly userId?: string;
  readonly startedAt: string; // ISO
}

export interface TelemetrySink {
  /** Record a finished tool-call span. MUST never throw. */
  record(span: ToolSpan): void;
}

const env = (k: string): string | undefined => process.env[k];

/** Structured stderr sink — always available, zero deps, never throws. */
const stderrSink: TelemetrySink = {
  record(span) {
    try {
      process.stderr.write(
        `${JSON.stringify({ kind: "mcp.tool.span", ...span })}\n`,
      );
    } catch {
      /* best-effort */
    }
  },
};

/**
 * Langfuse ingestion sink — POSTs one trace + one span event per call to the
 * public ingestion endpoint. Fire-and-forget; failures are logged once to
 * stderr and never propagate. Untested-live (deferred deploy smoke).
 */
const makeLangfuseSink = (
  host: string,
  publicKey: string,
  secretKey: string,
): TelemetrySink => {
  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
  const url = `${host.replace(/\/$/, "")}/api/public/ingestion`;
  return {
    record(span) {
      try {
        const traceId = `${span.tool}-${span.startedAt}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const body = {
          batch: [
            {
              id: `${traceId}-trace`,
              type: "trace-create",
              timestamp: span.startedAt,
              body: {
                id: traceId,
                name: `mcp.tool.${span.tool}`,
                userId: span.userId,
                metadata: {
                  role: span.role,
                  associationId: span.associationId,
                  ok: span.ok,
                },
                tags: [`role:${span.role}`, `tool:${span.tool}`],
              },
            },
            {
              id: `${traceId}-span`,
              type: "span-create",
              timestamp: span.startedAt,
              body: {
                id: `${traceId}-s`,
                traceId,
                name: span.tool,
                startTime: span.startedAt,
                endTime: new Date(
                  new Date(span.startedAt).getTime() + span.latencyMs,
                ).toISOString(),
                level: span.ok ? "DEFAULT" : "ERROR",
                statusMessage: span.error,
                metadata: {
                  latencyMs: span.latencyMs,
                  ok: span.ok,
                  associationId: span.associationId,
                },
              },
            },
          ],
        };
        void fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Basic ${auth}`,
          },
          body: JSON.stringify(body),
        }).catch((e: unknown) => {
          process.stderr.write(`langfuse ingestion failed: ${String(e)}\n`);
        });
      } catch (e) {
        process.stderr.write(`langfuse sink error: ${String(e)}\n`);
      }
    },
  };
};

const resolveDefaultSink = (): TelemetrySink => {
  const host = env("LANGFUSE_HOST");
  const pk = env("LANGFUSE_PUBLIC_KEY");
  const sk = env("LANGFUSE_SECRET_KEY");
  if (host && pk && sk) return makeLangfuseSink(host, pk, sk);
  return stderrSink;
};

let sink: TelemetrySink | undefined;

const activeSink = (): TelemetrySink => {
  sink ??= resolveDefaultSink();
  return sink;
};

/** Test/host hook: install a custom sink (e.g. an in-memory fake). */
export const setSink = (s: TelemetrySink): void => {
  sink = s;
};

/** Test hook: clear the override so the env-driven default is re-resolved. */
export const resetSink = (): void => {
  sink = undefined;
};

/** Emit a finished span. Best-effort; never throws. */
export const recordSpan = (span: ToolSpan): void => {
  try {
    activeSink().record(span);
  } catch {
    /* telemetry must never break the caller */
  }
};

/**
 * Time `fn`, emit a span, and return its result. `ok` is derived from BOTH a
 * thrown error AND a returned `{ isError: true }` (domain errors do NOT throw —
 * they return isError). Re-throws so the caller's control flow is unchanged.
 */
export const traceToolCall = async <
  R extends { readonly isError?: boolean; readonly content?: unknown },
>(
  meta: {
    readonly tool: string;
    readonly role: string;
    readonly associationId: string;
    readonly userId?: string;
  },
  fn: () => Promise<R>,
): Promise<R> => {
  const start = Date.now();
  const startedAt = new Date(start).toISOString();
  try {
    const result = await fn();
    const ok = result.isError !== true;
    recordSpan({
      ...meta,
      startedAt,
      latencyMs: Date.now() - start,
      ok,
      ...(ok ? {} : { error: extractErrorCode(result) }),
    });
    return result;
  } catch (e) {
    recordSpan({
      ...meta,
      startedAt,
      latencyMs: Date.now() - start,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
};

/** Record a span for an error exit that happens BEFORE the handler runs. */
export const recordErrorSpan = (meta: {
  readonly tool: string;
  readonly role: string;
  readonly associationId: string;
  readonly error: string;
  readonly userId?: string;
}): void => {
  recordSpan({ ...meta, startedAt: new Date().toISOString(), latencyMs: 0, ok: false });
};

/** Best-effort pull of a domain error code from a tool result body. */
const extractErrorCode = (result: {
  readonly content?: unknown;
}): string | undefined => {
  try {
    const content = result.content as
      | ReadonlyArray<{ readonly text?: string }>
      | undefined;
    const text = content?.[0]?.text;
    if (typeof text !== "string") return undefined;
    const parsed = JSON.parse(text) as { error?: unknown };
    return typeof parsed.error === "string" ? parsed.error : undefined;
  } catch {
    return undefined;
  }
};
