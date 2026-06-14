import { Members } from "@canna/app-services";
import { quantityGrams, systemIdGenerator, type ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

/**
 * Validate Prescription (Nível 3 — write) — sets the member's monthly quota.
 *
 * Wraps `Members.validatePrescription` app-service. Generates prescriptionId
 * server-side when omitted so callers never have to produce a ULID by hand.
 * validatedBy is taken from ctx.userId — never from args.
 *
 * Role gate: RESPONSAVEL_TECNICO | DIRETORIA (matches domain invariant).
 * riskLevel 3 — mutates member stream (PrescriptionValidated event).
 *
 * Result: member moves to ACTIVE (or stays ACTIVE with new prescription).
 * nextStep: get_member_quota.
 */
interface Args {
  readonly memberId: string;
  readonly prescriptionId?: string;
  readonly physicianCRM: string;
  readonly validFrom: string; // ISO date string, e.g. "2026-06-01"
  readonly validUntil: string; // ISO date string, e.g. "2026-12-01"
  readonly monthlyQuotaG: number;
}

export const validatePrescription: ToolDefinition<Args> = {
  name: "validate_prescription",
  title: "Validar Prescrição",
  description:
    "Registra e valida a prescrição médica de um membro, definindo a cota mensal em gramas. " +
    "Gera prescriptionId automaticamente se não informado. validatedBy vem do contexto do operador. " +
    "Role: RESPONSAVEL_TECNICO | DIRETORIA.",
  riskLevel: 3,
  allowedRoles: ["RESPONSAVEL_TECNICO", "DIRETORIA"],
  inputSchema: {
    type: "object",
    properties: {
      memberId: {
        type: "string",
        description: "ULID do membro",
      },
      prescriptionId: {
        type: "string",
        description:
          "ULID da prescrição. Gerado automaticamente pelo servidor se omitido.",
      },
      physicianCRM: {
        type: "string",
        description: "CRM do médico (ex: CRM/SP 123456)",
      },
      validFrom: {
        type: "string",
        description: "Data de início da validade em ISO 8601 (ex: 2026-06-01)",
      },
      validUntil: {
        type: "string",
        description: "Data de fim da validade em ISO 8601 (ex: 2026-12-01)",
      },
      monthlyQuotaG: {
        type: "number",
        minimum: 0.01,
        description: "Cota mensal em gramas (ex: 30)",
      },
    },
    required: ["memberId", "physicianCRM", "validFrom", "validUntil", "monthlyQuotaG"],
  },
  uiResourceUri: "ui://member-quota-card/app.html",
  async handler(args, ctx) {
    const quotaResult = quantityGrams(args.monthlyQuotaG);
    if (!quotaResult.ok) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: quotaResult.error.code,
              message: quotaResult.error.message,
            }),
          },
        ],
      };
    }

    const validFromDate = new Date(args.validFrom);
    const validUntilDate = new Date(args.validUntil);

    if (isNaN(validFromDate.getTime())) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "INVALID_VALID_FROM",
              message: "validFrom must be a valid ISO date string.",
            }),
          },
        ],
      };
    }

    if (isNaN(validUntilDate.getTime())) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "INVALID_VALID_UNTIL",
              message: "validUntil must be a valid ISO date string.",
            }),
          },
        ],
      };
    }

    if (validUntilDate <= validFromDate) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "INVALID_DATE_RANGE",
              message: "validUntil must be after validFrom.",
            }),
          },
        ],
      };
    }

    const prescriptionId = (args.prescriptionId ?? systemIdGenerator.generate()) as ULID;

    const result = await Members.validatePrescription(ctx.store, {
      type: "ValidatePrescription",
      memberId: args.memberId as ULID,
      prescriptionId,
      physicianCRM: args.physicianCRM,
      validFrom: validFromDate,
      validUntil: validUntilDate,
      monthlyQuotaG: quotaResult.value,
      validatedBy: ctx.userId as ULID,
      now: ctx.now,
    });

    if (!result.ok) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: result.error.code,
              memberId: args.memberId,
              prescriptionId,
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            memberId: args.memberId,
            prescriptionId,
            physicianCRM: args.physicianCRM,
            validFrom: validFromDate.toISOString(),
            validUntil: validUntilDate.toISOString(),
            monthlyQuotaG: args.monthlyQuotaG,
            validatedBy: ctx.userId,
            nextStep: "get_member_quota",
            message: "Prescrição validada. Cota mensal definida.",
          }),
        },
      ],
    };
  },
};
