import type { FastifyRequest } from "fastify";

/**
 * Caller identity resolved from the incoming HTTP request.
 *
 * v0.2.1 wire: this is a header-stub used by the REST surface so we can
 * exercise Nível-4 / system-integration endpoints before OAuth lands.
 *
 * Production wiring (v0.3+): swap the header reads below for the OAuth 2.1
 * scope mapping documented in ADR-002 ("MCP-first surface"). The Open WebUI
 * sidecar mints the bearer token, the REST handler verifies it, and the
 * resolved subject becomes `userId`. `role` and `associationId` come from the
 * token claims, not from caller-supplied headers.
 */
export interface CallerContext {
  readonly userId: string;
  readonly role: string;
  readonly associationId: string;
}

const firstHeader = (
  raw: string | string[] | undefined,
): string | undefined => {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) return raw[0];
  return raw;
};

/**
 * v0.2.1 stub: reads `x-canna-user`, `x-canna-role`, `x-canna-association`
 * headers. Returns sensible defaults so health/openapi work without auth.
 * Real OAuth wiring lands when the Open WebUI sidecar is configured.
 */
export const resolveCallerContext = async (
  req: FastifyRequest,
): Promise<CallerContext> => {
  const userId = firstHeader(req.headers["x-canna-user"]) ?? "anonymous";
  const role = firstHeader(req.headers["x-canna-role"]) ?? "GUEST";
  const associationId =
    firstHeader(req.headers["x-canna-association"]) ?? "unknown";
  return { userId, role, associationId };
};
