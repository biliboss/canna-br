import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type { CannaApiDeps } from "../app.js";

/**
 * Nível-4 endpoints. These require TOTP co-presence + DPO/Admin scope.
 * They are intentionally **not implemented** in v0.2.1: the surface returns
 * 501 so callers (and OpenAPI consumers) can discover them, but no domain
 * mutation happens until the TOTP verifier + admin-action audit log lands.
 *
 * Per ADR-002: the MCP surface MUST NOT expose these. Always REST + TOTP.
 */
const TOTP_NOTE =
  "Nível-4 admin endpoint. Wiring deferred to v0.3+: requires TOTP " +
  "verification, DPO/Admin co-presence, and structured admin-action audit " +
  "trail. See ADR-002 and AGENTS.md §RBAC.";

const TotpJustification = z.object({
  totp: z.string().regex(/^\d{6,8}$/, "TOTP must be 6-8 digits"),
  justification: z.string().min(10, "justification min 10 chars"),
});

const sendValidation = (reply: FastifyReply, err: z.ZodError): FastifyReply =>
  reply.code(400).send({
    error: "VALIDATION_ERROR",
    message: "Request body failed schema validation",
    context: { issues: err.issues },
  });

const send501 = (reply: FastifyReply, endpoint: string): FastifyReply =>
  reply.code(501).send({
    error: "NOT_IMPLEMENTED_TOTP_REQUIRED",
    note: TOTP_NOTE,
    endpoint,
  });

export const registerAdminRoutes = async (
  app: FastifyInstance,
  _deps: CannaApiDeps,
): Promise<void> => {
  app.post<{ Params: { id: string } }>(
    "/v1/admin/crypto-delete-member/:id",
    async (req, reply) => {
      const parsed = TotpJustification.safeParse(req.body);
      if (!parsed.success) return sendValidation(reply, parsed.error);
      return send501(reply, "crypto-delete-member");
    },
  );

  app.post("/v1/admin/change-user-role", async (req, reply) => {
    const parsed = TotpJustification.safeParse(req.body);
    if (!parsed.success) return sendValidation(reply, parsed.error);
    return send501(reply, "change-user-role");
  });

  app.post("/v1/admin/rotate-site-kek", async (req, reply) => {
    const parsed = TotpJustification.safeParse(req.body);
    if (!parsed.success) return sendValidation(reply, parsed.error);
    return send501(reply, "rotate-site-kek");
  });

  app.post("/v1/admin/submit-sngpc-production", async (req, reply) => {
    const parsed = TotpJustification.safeParse(req.body);
    if (!parsed.success) return sendValidation(reply, parsed.error);
    return send501(reply, "submit-sngpc-production");
  });

  app.post("/v1/admin/recall-lot", async (req, reply) => {
    const parsed = TotpJustification.safeParse(req.body);
    if (!parsed.success) return sendValidation(reply, parsed.error);
    return send501(reply, "recall-lot");
  });

  app.post("/v1/admin/change-quota", async (req, reply) => {
    const parsed = TotpJustification.safeParse(req.body);
    if (!parsed.success) return sendValidation(reply, parsed.error);
    return send501(reply, "change-quota");
  });
};
