/**
 * @canna/crypto — Envelope-encryption primitives for LGPD compliance.
 *
 *   Master Key → Site KEK (HKDF-SHA256, per-tenant, rotated quarterly)
 *     → Member DEK (random 256-bit, AES-GCM-wrapped, per-member)
 *       → AES-256-GCM(sensitive field, DEK)
 *
 * Built on Node 20+ Web Crypto (`crypto.subtle` + `crypto.getRandomValues`).
 * Zero third-party crypto deps.
 *
 * See `apps/docs/src/content/docs/architecture/lgpd-crypto.md` for the
 * canonical model + Art. 18 IV crypto-deletion narrative.
 */

export type { DeriveSiteKekParams } from "./site-kek.js";
export { deriveSiteKek } from "./site-kek.js";

export type {
  CreateMemberDekParams,
  EncryptedMemberDek,
  UnwrapMemberDekParams,
} from "./member-dek.js";
export { createMemberDek, unwrapMemberDek } from "./member-dek.js";

export type { EncryptedField } from "./encrypt.js";
export { encryptField, decryptField } from "./encrypt.js";

export { hashCpf } from "./cpf-hash.js";

export type {
  CryptoDeleteAuditEntry,
  CryptoDeleteMutation,
  CryptoDeleteMutator,
  CryptoDeleteRequest,
  CryptoDeleteResult,
} from "./crypto-delete.js";
export { buildCryptoDeleteMutation, cryptoDeleteSpec } from "./crypto-delete.js";
