import { Members } from "@canna/app-services";
import { hashCpf } from "@canna/crypto";
import { systemIdGenerator, type ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

/**
 * Register Member (Nível 3 — write) — the v0.1 onboarding entry point.
 *
 * Wraps the existing `Members.registerMember` app-service (same command the
 * REST route POST /v1/commands/register-member calls) — NO duplicated domain
 * logic. The agent gets a raw CPF from the operator; we hash it (LGPD: CPF is
 * never stored plaintext) and generate the member ULID server-side, so the
 * caller never has to produce a hash or an id by hand.
 *
 * associationId + registeredBy come from the multi-tenant context (headers),
 * NOT from args — prevents cross-association member injection.
 *
 * Result: member enters PENDING_CONSENT. The next step is `grant_consent`.
 */
interface Args {
  readonly cpf: string;
  readonly memberId?: string;
}

// Per-tenant CPF salt. v0.1 dev: single instance reads it from env (the API
// path takes a pre-hashed cpfHash, so this is the canonical hashing site for
// the agent flow). Replace with a per-association secret when Zitadel lands.
const SITE_SALT = process.env.CANNA_CPF_SALT ?? "canna-dev-site-salt";

const CPF_DIGITS_RE = /[.\-\s]/g;

export const registerMember: ToolDefinition<Args> = {
  name: "register_member",
  title: "Cadastrar Membro",
  description:
    "Cadastra um novo membro da associação a partir do CPF. Gera o ID do membro, grava o CPF de forma hasheada (LGPD) e deixa o membro em PENDING_CONSENT — o próximo passo é registrar o consentimento (grant_consent). Use quando o operador quer cadastrar/adicionar um membro. Role: RESPONSAVEL_TECNICO | DIRETORIA.",
  riskLevel: 3,
  allowedRoles: ["RESPONSAVEL_TECNICO", "DIRETORIA"],
  inputSchema: {
    type: "object",
    properties: {
      cpf: {
        type: "string",
        description: "CPF do membro (com ou sem pontuação, ex: 123.456.789-00)",
      },
      memberId: {
        type: "string",
        description: "ULID opcional do membro; gerado automaticamente se omitido",
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

    const cpfHash = await hashCpf(cpf, SITE_SALT);
    const memberId = (args.memberId ?? systemIdGenerator.generate()) as ULID;

    const result = await Members.registerMember(ctx.store, {
      type: "RegisterMember",
      memberId,
      associationId: ctx.associationId as ULID,
      cpfHash,
      registeredBy: ctx.userId as ULID,
      now: ctx.now,
    });

    if (!result.ok) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: result.error.code, memberId }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            memberId,
            associationId: ctx.associationId,
            status: "PENDING_CONSENT",
            registeredBy: ctx.userId,
            nextStep: "grant_consent",
            message: "Membro cadastrado. Aguardando consentimento (PENDING_CONSENT).",
          }),
        },
      ],
    };
  },
};
