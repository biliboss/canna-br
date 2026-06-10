import type { FastifyInstance } from "fastify";

/**
 * Hand-rolled OpenAPI 3.1 document for v0.2.1. Auto-generation deliberately
 * deferred — explicit JSON keeps the surface small enough to audit at a
 * glance, matches the ADR-002 stance that REST is the *minority* surface,
 * and avoids pulling a schema-to-OpenAPI plugin that complicates type
 * inference.
 *
 * When the surface grows past ~20 routes, swap this for `fastify-zod` +
 * `@fastify/swagger`.
 */
const TOTP_BODY_SCHEMA = {
  type: "object",
  required: ["totp", "justification"],
  properties: {
    totp: { type: "string", pattern: "^\\d{6,8}$" },
    justification: { type: "string", minLength: 10 },
  },
} as const;

const ERROR_RESPONSE = {
  type: "object",
  required: ["error", "message"],
  properties: {
    error: { type: "string", description: "Domain error code or sentinel" },
    message: { type: "string" },
    context: { type: "object", additionalProperties: true },
  },
} as const;

const COMMAND_OK_RESPONSE = {
  type: "object",
  required: ["events", "nextVersion"],
  properties: {
    events: { type: "array", items: { type: "object" } },
    nextVersion: {
      type: "string",
      description: "bigint stream version as decimal string",
    },
  },
} as const;

const commandPath = (
  operationId: string,
  summary: string,
  requestBody: Record<string, unknown>,
) => ({
  post: {
    operationId,
    summary,
    tags: ["commands"],
    requestBody: {
      required: true,
      content: { "application/json": { schema: requestBody } },
    },
    responses: {
      "200": {
        description: "Command accepted; events appended.",
        content: { "application/json": { schema: COMMAND_OK_RESPONSE } },
      },
      "400": {
        description: "Validation or domain error.",
        content: { "application/json": { schema: ERROR_RESPONSE } },
      },
    },
  },
});

const adminPath = (operationId: string, summary: string) => ({
  post: {
    operationId,
    summary,
    tags: ["admin", "nivel-4"],
    description:
      "Nível-4 endpoint. TOTP + DPO/Admin co-presence required. " +
      "Not implemented in v0.2.1 — returns 501.",
    requestBody: {
      required: true,
      content: { "application/json": { schema: TOTP_BODY_SCHEMA } },
    },
    responses: {
      "501": {
        description:
          "Not implemented yet — wiring deferred to v0.3+ TOTP verifier.",
        content: { "application/json": { schema: ERROR_RESPONSE } },
      },
      "400": {
        description: "Body failed validation.",
        content: { "application/json": { schema: ERROR_RESPONSE } },
      },
    },
  },
});

const buildSpec = () => ({
  openapi: "3.1.0",
  info: {
    title: "Canna REST API",
    version: "0.2.1",
    description:
      "Minority REST/OpenAPI surface for canna-oss. Houses system " +
      "integrations + Nível-4 TOTP-gated commands. The primary surface is " +
      "MCP — see apps/mcp. ADR-002 documents the boundary.",
  },
  servers: [{ url: "/", description: "self" }],
  tags: [
    { name: "health", description: "Liveness probes" },
    { name: "commands", description: "Domain commands (Nível 1–3)" },
    {
      name: "admin",
      description: "Nível-4 TOTP-gated admin operations (501 in v0.2.1)",
    },
  ],
  paths: {
    "/health": {
      get: {
        operationId: "health",
        summary: "Liveness probe",
        tags: ["health"],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["ok", "version", "uptimeMs"],
                  properties: {
                    ok: { type: "boolean" },
                    version: { type: "string" },
                    uptimeMs: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/v1/commands/register-member": commandPath(
      "register_member",
      "Register a new member (Membership.RegisterMember)",
      {
        type: "object",
        required: [
          "memberId",
          "associationId",
          "cpfHash",
          "registeredBy",
        ],
        properties: {
          memberId: { type: "string" },
          associationId: { type: "string" },
          cpfHash: { type: "string" },
          registeredBy: { type: "string" },
          now: { type: "string", format: "date-time" },
        },
      },
    ),
    "/v1/commands/grant-consent": commandPath(
      "grant_consent",
      "Grant a member consent at a specific version",
      {
        type: "object",
        required: ["memberId", "consentVersion", "grantedBy"],
        properties: {
          memberId: { type: "string" },
          consentVersion: { type: "integer", minimum: 1 },
          grantedBy: { type: "string" },
          now: { type: "string", format: "date-time" },
        },
      },
    ),
    "/v1/commands/revoke-consent": commandPath(
      "revoke_consent",
      "Revoke an active member's consent",
      {
        type: "object",
        required: ["memberId", "revokedBy"],
        properties: {
          memberId: { type: "string" },
          revokedBy: { type: "string" },
          now: { type: "string", format: "date-time" },
        },
      },
    ),
    "/v1/commands/validate-prescription": commandPath(
      "validate_prescription",
      "Validate a prescription for an ACTIVE member",
      {
        type: "object",
        required: [
          "memberId",
          "prescriptionId",
          "physicianCRM",
          "validFrom",
          "validUntil",
          "monthlyQuotaG",
          "validatedBy",
        ],
        properties: {
          memberId: { type: "string" },
          prescriptionId: { type: "string" },
          physicianCRM: { type: "string" },
          validFrom: { type: "string", format: "date-time" },
          validUntil: { type: "string", format: "date-time" },
          monthlyQuotaG: { type: "number", minimum: 0 },
          validatedBy: { type: "string" },
          now: { type: "string", format: "date-time" },
        },
      },
    ),
    "/v1/commands/create-lot": commandPath(
      "create_lot",
      "Create a new inventory lot in QUARANTINED state",
      {
        type: "object",
        required: [
          "lotId",
          "associationId",
          "productSku",
          "initialQuantityG",
          "origin",
          "producedAt",
          "expiresAt",
          "createdBy",
        ],
        properties: {
          lotId: { type: "string" },
          associationId: { type: "string" },
          productSku: { type: "string" },
          initialQuantityG: { type: "number", minimum: 0 },
          origin: {
            type: "string",
            enum: [
              "INTERNAL_CULTIVATION",
              "EXTERNAL_PURCHASE",
              "DONATION",
            ],
          },
          producedAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time" },
          createdBy: { type: "string" },
          now: { type: "string", format: "date-time" },
        },
      },
    ),
    "/v1/commands/release-lot": commandPath(
      "release_lot",
      "Release a quarantined lot to AVAILABLE",
      {
        type: "object",
        required: ["lotId", "coaReference", "releasedBy"],
        properties: {
          lotId: { type: "string" },
          coaReference: { type: "string" },
          releasedBy: { type: "string" },
          now: { type: "string", format: "date-time" },
        },
      },
    ),
    "/v1/commands/quarantine-lot": commandPath(
      "quarantine_lot",
      "Move a lot into QUARANTINED",
      {
        type: "object",
        required: ["lotId", "reason", "quarantinedBy"],
        properties: {
          lotId: { type: "string" },
          reason: { type: "string" },
          quarantinedBy: { type: "string" },
          now: { type: "string", format: "date-time" },
        },
      },
    ),
    "/v1/commands/recall-lot": commandPath(
      "recall_lot",
      "Recall a lot (terminal state)",
      {
        type: "object",
        required: ["lotId", "reason", "recalledBy"],
        properties: {
          lotId: { type: "string" },
          reason: { type: "string" },
          recalledBy: { type: "string" },
          now: { type: "string", format: "date-time" },
        },
      },
    ),

    "/v1/admin/crypto-delete-member/{id}": {
      ...adminPath(
        "admin_crypto_delete_member",
        "Crypto-delete a member's PII keys (LGPD Art. 18 IV)",
      ),
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
    },
    "/v1/admin/change-user-role": adminPath(
      "admin_change_user_role",
      "Change a user's RBAC role",
    ),
    "/v1/admin/rotate-site-kek": adminPath(
      "admin_rotate_site_kek",
      "Rotate the site-level key-encryption-key",
    ),
    "/v1/admin/submit-sngpc-production": adminPath(
      "admin_submit_sngpc_production",
      "Submit SNGPC report to ANVISA (production)",
    ),
    "/v1/admin/recall-lot": adminPath(
      "admin_recall_lot",
      "Recall a lot with TOTP confirmation",
    ),
    "/v1/admin/change-quota": adminPath(
      "admin_change_quota",
      "Adjust a member's monthly quota outside prescription",
    ),
  },
});

export const registerOpenApiRoutes = async (
  app: FastifyInstance,
): Promise<void> => {
  const spec = buildSpec();
  app.get("/openapi.json", async () => spec);
};
