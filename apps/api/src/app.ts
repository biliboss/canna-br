import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { CannaEventStore } from "@canna/event-store";
import { registerHealthRoutes } from "./routes/health.js";
import { registerCommandRoutes } from "./routes/commands.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerOpenApiRoutes } from "./routes/openapi.js";

export interface CannaApiDeps {
  readonly store: CannaEventStore;
  readonly now: () => Date;
  /**
   * Optional fastify logger config. Tests pass `false`; production passes a
   * pino config.
   */
  readonly logger?: boolean | Record<string, unknown>;
  /**
   * CORS origin(s). Default: false (no CORS, same-origin only).
   */
  readonly corsOrigin?: string | string[] | boolean;
}

/**
 * Build a Fastify instance wired with canna REST routes.
 *
 * v0.2.1 surface (per ADR-002, MCP-first):
 *   - GET  /health
 *   - GET  /openapi.json
 *   - POST /v1/commands/{register-member, grant-consent, revoke-consent,
 *           validate-prescription, create-lot, release-lot, quarantine-lot,
 *           recall-lot}
 *   - POST /v1/admin/{crypto-delete-member/:id, change-user-role,
 *           rotate-site-kek, submit-sngpc-production, recall-lot,
 *           change-quota} → 501 (TOTP-gated, not yet wired)
 *
 * Direct POST /v1/commands/record-dispensation is intentionally absent —
 * dispensations flow through MCP `request_record_dispensation` +
 * `approve_pending_action` (Nível 3 two-step).
 */
export const createCannaApi = async (
  deps: CannaApiDeps,
): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: deps.logger ?? false,
  });

  await app.register(cors, {
    origin: deps.corsOrigin ?? false,
  });

  await registerHealthRoutes(app, deps);
  await registerCommandRoutes(app, deps);
  await registerAdminRoutes(app, deps);
  await registerOpenApiRoutes(app);

  return app;
};
