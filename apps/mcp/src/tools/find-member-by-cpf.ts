import { hashCpf } from "@canna/crypto";
import type { ToolDefinition } from "../types.js";

/**
 * Find Member by CPF (Nível 1 — read-only).
 *
 * Resolves the server-generated ULID (`memberId`) for a known CPF so the
 * operator can pass it to write tools (grant_consent, record_dispensation, …)
 * without needing to look it up in a separate admin screen.
 *
 * LGPD-safe design:
 *  - The raw CPF is hashed with SITE_SALT before any lookup.
 *  - The tool NEVER returns or logs the raw CPF — only the derived hash and
 *    the memberId are used internally; neither the hash nor the CPF appears
 *    in the response payload.
 *  - The query is scoped to ctx.associationId, preventing cross-tenant leaks.
 *
 * Implementation strategy:
 *  1. Hash the CPF with the same salt used by register_member.
 *  2. Query the read-model store (ctx.readModelStore.getMemberByCpfHash),
 *     which is O(n) in-memory or O(1) via a SQL index in Postgres.
 *  3. If readModelStore is unavailable (not yet wired for this deployment),
 *     return a clear NOT_AVAILABLE error rather than silently doing nothing.
 *
 * No domain logic lives here — this is a pure read.
 */

interface Args {
  readonly cpf: string;
}

const SITE_SALT = process.env.CANNA_CPF_SALT ?? "canna-dev-site-salt";
const CPF_DIGITS_RE = /[.\-\s]/g;

export const findMemberByCpf: ToolDefinition<Args> = {
  name: "find_member_by_cpf",
  title: "Buscar Membro por CPF",
  description:
    "Localiza o ID do membro (ULID gerado pelo servidor) a partir do CPF. Use para recuperar o memberId após o cadastro ou quando o operador só tem o CPF em mãos. O CPF é hasheado (LGPD) antes de qualquer consulta — jamais é armazenado ou retornado em texto claro. Role: DISPENSADOR | RT | DPO | AUDITOR | DIRETORIA.",
  riskLevel: 1,
  allowedRoles: ["DISPENSADOR", "RESPONSAVEL_TECNICO", "DPO", "AUDITOR", "DIRETORIA"],
  inputSchema: {
    type: "object",
    properties: {
      cpf: {
        type: "string",
        description: "CPF do membro (com ou sem pontuação, ex: 123.456.789-00)",
      },
    },
    required: ["cpf"],
  },
  uiResourceUri: "ui://member-quota-card/app.html",
  async handler(args, ctx) {
    if (!ctx.associationId || ctx.associationId === "unknown") {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "NO_ASSOCIATION_CONTEXT",
              message: "Sem associação no contexto (x-canna-association).",
            }),
          },
        ],
      };
    }

    const cpf = (args.cpf ?? "").trim();
    if (cpf.replace(CPF_DIGITS_RE, "").length !== 11) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "INVALID_CPF",
              message: "CPF deve ter 11 dígitos.",
            }),
          },
        ],
      };
    }

    if (ctx.readModelStore === undefined) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "READ_MODEL_STORE_UNAVAILABLE",
              message:
                "O store de leitura não está disponível neste deployment. Contate o administrador.",
            }),
          },
        ],
      };
    }

    // Hash CPF with the same salt used by register_member (LGPD: raw CPF never
    // leaves this function — only the derived hash is used for the lookup).
    const cpfHash = await hashCpf(cpf, SITE_SALT);

    const row = ctx.readModelStore.getMemberByCpfHash(cpfHash, ctx.associationId);

    if (row === undefined) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "MEMBER_NOT_FOUND",
              message: "Nenhum membro encontrado com este CPF nesta associação.",
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
            memberId: row.memberId,
            status: row.status,
            associationId: row.associationId,
            nextStep: row.status === "PENDING_CONSENT" ? "grant_consent" : null,
          }),
        },
      ],
    };
  },
};
