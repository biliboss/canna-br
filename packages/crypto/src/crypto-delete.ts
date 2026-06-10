/**
 * Crypto-deletion orchestration — LGPD Art. 18 IV.
 *
 * This module is INTENTIONALLY pure orchestration. It never touches the DB
 * directly — the caller injects a `dbMutator` that runs inside its own
 * transaction (Drizzle, raw SQL, in-memory mock, whatever).
 *
 * The canonical mutation payload is fixed here so every storage backend
 * applies the SAME deletion semantics:
 *
 *  - `status = 'crypto_deleted'`
 *  - `crypto_deleted_at = now`
 *  - `encrypted_member_dek = null`
 *  - `encrypted_member_dek_iv = null`
 *  - `encrypted_member_dek_kek_version = null`
 *  - `cpf_hash = null`   (eliminate dedup-by-CPF traceability)
 *
 * Once the encrypted DEK row is destroyed, the per-field ciphertext stays
 * in storage as computational noise — there is no path to recover plaintext.
 */

export interface CryptoDeleteMutation {
  readonly status: "crypto_deleted";
  readonly cryptoDeletedAt: Date;
  readonly encryptedMemberDek: null;
  readonly encryptedMemberDekIv: null;
  readonly encryptedMemberDekKekVersion: null;
  readonly cpfHash: null;
}

export interface CryptoDeleteAuditEntry {
  readonly tableName: "members";
  readonly recordId: string;
  readonly action: "CRYPTO_DELETE";
  readonly reason: string;
  readonly actorId: string;
  readonly actorRole: string;
  readonly at: Date;
}

export interface CryptoDeleteRequest {
  readonly memberId: string;
  readonly actorId: string;
  readonly actorRole: string;
  /** Human-readable LGPD justification — defaults to Art. 18 IV. */
  readonly reason?: string;
  /** Injectable clock for tests. */
  readonly now?: () => Date;
  readonly dbMutator: CryptoDeleteMutator;
}

export interface CryptoDeleteResult {
  readonly memberId: string;
  readonly done: true;
  readonly mutation: CryptoDeleteMutation;
  readonly audit: CryptoDeleteAuditEntry;
}

/**
 * The DB mutator the caller injects. It MUST:
 *  - run inside a transaction
 *  - apply `mutation` to `members WHERE id = memberId`
 *  - append `audit` to the immutable audit log
 *
 * Returning is enough — throw to abort.
 */
export type CryptoDeleteMutator = (args: {
  readonly memberId: string;
  readonly mutation: CryptoDeleteMutation;
  readonly audit: CryptoDeleteAuditEntry;
}) => Promise<void>;

/**
 * Canonical crypto-deletion mutation payload — exposed for callers that
 * want to inspect what will be written before invoking the mutator.
 */
export const buildCryptoDeleteMutation = (at: Date): CryptoDeleteMutation => ({
  status: "crypto_deleted",
  cryptoDeletedAt: at,
  encryptedMemberDek: null,
  encryptedMemberDekIv: null,
  encryptedMemberDekKekVersion: null,
  cpfHash: null,
});

/**
 * Orchestrate a crypto-deletion for one member.
 *
 * This function does NOT decide WHEN deletion is allowed (auth/consent flow
 * lives in app-services). It only builds the canonical mutation payload +
 * audit entry, hands them to the injected mutator, and reports done.
 */
export const cryptoDeleteSpec = async (
  req: CryptoDeleteRequest,
): Promise<CryptoDeleteResult> => {
  const now = req.now ?? (() => new Date());
  const at = now();

  const mutation = buildCryptoDeleteMutation(at);

  const audit: CryptoDeleteAuditEntry = {
    tableName: "members",
    recordId: req.memberId,
    action: "CRYPTO_DELETE",
    reason: req.reason ?? "Art. 18 IV LGPD — solicitação do titular",
    actorId: req.actorId,
    actorRole: req.actorRole,
    at,
  };

  await req.dbMutator({ memberId: req.memberId, mutation, audit });

  return {
    memberId: req.memberId,
    done: true,
    mutation,
    audit,
  };
};
