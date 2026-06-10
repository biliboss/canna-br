import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  quantityGrams,
  type DomainError,
  type DomainEvent,
  type QuantityGrams,
  type Result,
  type ULID,
} from "@canna/shared";
import { Members, Lots, type CommandResult } from "@canna/app-services";
import type { CannaApiDeps } from "../app.js";

/**
 * Map a CommandResult from @canna/app-services to an HTTP response.
 *   - ok  → 200 { events, nextVersion }
 *   - err → 400 { error: <domain-code>, message, context }
 *
 * Note: bigint is JSON-serialized as string so HTTP clients don't choke.
 */
const sendCommandResult = <E extends DomainEvent<string, unknown>>(
  reply: FastifyReply,
  result: CommandResult<E>,
): FastifyReply => {
  if (result.ok === true) {
    return reply.code(200).send({
      events: result.value.events,
      nextVersion: result.value.nextVersion.toString(),
    });
  }
  const e: DomainError = result.error;
  return reply.code(400).send({
    error: e.code,
    message: e.message,
    context: e.context ?? {},
  });
};

type GramsResult = Result<DomainError, QuantityGrams>;

/** Parse a number-grams field and convert to QuantityGrams. */
const grams = (n: number): GramsResult => quantityGrams(n);

const dateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "must be ISO-8601 date string",
  })
  .transform((v) => new Date(v));

// ──────────────────────────────────────────────────────────────────────────
// Zod schemas (one per endpoint body)
// ──────────────────────────────────────────────────────────────────────────

const RegisterMemberBody = z.object({
  memberId: z.string().min(1),
  associationId: z.string().min(1),
  cpfHash: z.string().min(1),
  registeredBy: z.string().min(1),
  now: dateString.optional(),
});

const GrantConsentBody = z.object({
  memberId: z.string().min(1),
  consentVersion: z.number().int().positive(),
  grantedBy: z.string().min(1),
  now: dateString.optional(),
});

const RevokeConsentBody = z.object({
  memberId: z.string().min(1),
  revokedBy: z.string().min(1),
  now: dateString.optional(),
});

const ValidatePrescriptionBody = z.object({
  memberId: z.string().min(1),
  prescriptionId: z.string().min(1),
  physicianCRM: z.string().min(1),
  validFrom: dateString,
  validUntil: dateString,
  monthlyQuotaG: z.number().nonnegative(),
  validatedBy: z.string().min(1),
  now: dateString.optional(),
});

const CreateLotBody = z.object({
  lotId: z.string().min(1),
  associationId: z.string().min(1),
  productSku: z.string().min(1),
  initialQuantityG: z.number().nonnegative(),
  origin: z.enum(["INTERNAL_CULTIVATION", "EXTERNAL_PURCHASE", "DONATION"]),
  producedAt: dateString,
  expiresAt: dateString,
  createdBy: z.string().min(1),
  now: dateString.optional(),
});

const ReleaseLotBody = z.object({
  lotId: z.string().min(1),
  coaReference: z.string().min(1),
  releasedBy: z.string().min(1),
  now: dateString.optional(),
});

const QuarantineLotBody = z.object({
  lotId: z.string().min(1),
  reason: z.string().min(1),
  quarantinedBy: z.string().min(1),
  now: dateString.optional(),
});

const RecallLotBody = z.object({
  lotId: z.string().min(1),
  reason: z.string().min(1),
  recalledBy: z.string().min(1),
  now: dateString.optional(),
});

/**
 * Send a 400 from a zod parse failure shaped like a domain error.
 */
const sendZodError = (reply: FastifyReply, err: z.ZodError): FastifyReply =>
  reply.code(400).send({
    error: "VALIDATION_ERROR",
    message: "Request body failed schema validation",
    context: { issues: err.issues },
  });

const sendQuantityError = (
  reply: FastifyReply,
  e: DomainError,
): FastifyReply =>
  reply.code(400).send({
    error: e.code,
    message: e.message,
    context: e.context ?? {},
  });

export const registerCommandRoutes = async (
  app: FastifyInstance,
  deps: CannaApiDeps,
): Promise<void> => {
  // ──────────────── Membership ────────────────

  app.post("/v1/commands/register-member", async (req, reply) => {
    const parsed = RegisterMemberBody.safeParse(req.body);
    if (!parsed.success) return sendZodError(reply, parsed.error);
    const b = parsed.data;
    const result = await Members.registerMember(deps.store, {
      type: "RegisterMember",
      memberId: b.memberId as ULID,
      associationId: b.associationId as ULID,
      cpfHash: b.cpfHash,
      registeredBy: b.registeredBy as ULID,
      now: b.now ?? deps.now(),
    });
    return sendCommandResult(reply, result);
  });

  app.post("/v1/commands/grant-consent", async (req, reply) => {
    const parsed = GrantConsentBody.safeParse(req.body);
    if (!parsed.success) return sendZodError(reply, parsed.error);
    const b = parsed.data;
    const result = await Members.grantConsent(deps.store, {
      type: "GrantConsent",
      memberId: b.memberId as ULID,
      consentVersion: b.consentVersion,
      grantedBy: b.grantedBy as ULID,
      now: b.now ?? deps.now(),
    });
    return sendCommandResult(reply, result);
  });

  app.post("/v1/commands/revoke-consent", async (req, reply) => {
    const parsed = RevokeConsentBody.safeParse(req.body);
    if (!parsed.success) return sendZodError(reply, parsed.error);
    const b = parsed.data;
    const result = await Members.revokeConsent(deps.store, {
      type: "RevokeConsent",
      memberId: b.memberId as ULID,
      revokedBy: b.revokedBy as ULID,
      now: b.now ?? deps.now(),
    });
    return sendCommandResult(reply, result);
  });

  app.post("/v1/commands/validate-prescription", async (req, reply) => {
    const parsed = ValidatePrescriptionBody.safeParse(req.body);
    if (!parsed.success) return sendZodError(reply, parsed.error);
    const b = parsed.data;
    const q = grams(b.monthlyQuotaG);
    if (q.ok !== true) return sendQuantityError(reply, q.error);
    const result = await Members.validatePrescription(deps.store, {
      type: "ValidatePrescription",
      memberId: b.memberId as ULID,
      prescriptionId: b.prescriptionId as ULID,
      physicianCRM: b.physicianCRM,
      validFrom: b.validFrom,
      validUntil: b.validUntil,
      monthlyQuotaG: q.value,
      validatedBy: b.validatedBy as ULID,
      now: b.now ?? deps.now(),
    });
    return sendCommandResult(reply, result);
  });

  // ──────────────── Inventory ────────────────

  app.post("/v1/commands/create-lot", async (req, reply) => {
    const parsed = CreateLotBody.safeParse(req.body);
    if (!parsed.success) return sendZodError(reply, parsed.error);
    const b = parsed.data;
    const q = grams(b.initialQuantityG);
    if (q.ok !== true) return sendQuantityError(reply, q.error);
    const result = await Lots.createLot(deps.store, {
      type: "CreateLot",
      lotId: b.lotId as ULID,
      associationId: b.associationId as ULID,
      productSku: b.productSku,
      initialQuantityG: q.value,
      origin: b.origin,
      producedAt: b.producedAt,
      expiresAt: b.expiresAt,
      createdBy: b.createdBy as ULID,
      now: b.now ?? deps.now(),
    });
    return sendCommandResult(reply, result);
  });

  app.post("/v1/commands/release-lot", async (req, reply) => {
    const parsed = ReleaseLotBody.safeParse(req.body);
    if (!parsed.success) return sendZodError(reply, parsed.error);
    const b = parsed.data;
    const result = await Lots.releaseLot(deps.store, {
      type: "ReleaseLot",
      lotId: b.lotId as ULID,
      coaReference: b.coaReference,
      releasedBy: b.releasedBy as ULID,
      now: b.now ?? deps.now(),
    });
    return sendCommandResult(reply, result);
  });

  app.post("/v1/commands/quarantine-lot", async (req, reply) => {
    const parsed = QuarantineLotBody.safeParse(req.body);
    if (!parsed.success) return sendZodError(reply, parsed.error);
    const b = parsed.data;
    const result = await Lots.quarantineLot(deps.store, {
      type: "QuarantineLot",
      lotId: b.lotId as ULID,
      reason: b.reason,
      quarantinedBy: b.quarantinedBy as ULID,
      now: b.now ?? deps.now(),
    });
    return sendCommandResult(reply, result);
  });

  app.post("/v1/commands/recall-lot", async (req, reply) => {
    const parsed = RecallLotBody.safeParse(req.body);
    if (!parsed.success) return sendZodError(reply, parsed.error);
    const b = parsed.data;
    const result = await Lots.recallLot(deps.store, {
      type: "RecallLot",
      lotId: b.lotId as ULID,
      reason: b.reason,
      recalledBy: b.recalledBy as ULID,
      now: b.now ?? deps.now(),
    });
    return sendCommandResult(reply, result);
  });

  // NOTE: POST /v1/commands/record-dispensation is intentionally NOT mounted.
  // Dispensations flow through MCP `request_record_dispensation` + approval
  // (Nível 3, two-step). REST exposure would bypass the human-in-the-loop
  // approval gate documented in ADR-002 and AGENTS.md.
};
