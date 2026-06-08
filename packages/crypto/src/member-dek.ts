import type { webcrypto } from "node:crypto";

/**
 * Member DEK (Data Encryption Key) — random 256-bit per-member key
 * wrapped with the Site KEK and stored as `EncryptedMemberDEK` in DB.
 *
 * Crypto-deletion (LGPD Art. 18 IV) = nulling the encrypted DEK row.
 * Because the DEK is random (not derived from member_id/site_id), there
 * is no path of reconstruction — ciphertext becomes computational noise.
 */

const DEK_LENGTH_BYTES = 32; // 256 bits
const GCM_IV_LENGTH_BYTES = 12; // 96 bits (NIST SP 800-38D recommended)

export interface EncryptedMemberDek {
  readonly encryptedDek: Uint8Array;
  readonly iv: Uint8Array;
  readonly kekVersion: number;
}

export interface CreateMemberDekParams {
  readonly siteKek: webcrypto.CryptoKey;
  readonly kekVersion: number;
}

/**
 * Generate a random Member DEK and wrap it with the Site KEK (AES-GCM).
 * The plaintext DEK is zeroed from memory before return.
 */
export const createMemberDek = async (
  params: CreateMemberDekParams,
): Promise<EncryptedMemberDek> => {
  const { siteKek, kekVersion } = params;

  // 1. Generate random DEK (256-bit).
  const dek = new Uint8Array(DEK_LENGTH_BYTES);
  crypto.getRandomValues(dek);

  // 2. Wrap DEK with Site KEK via AES-GCM.
  const iv = new Uint8Array(GCM_IV_LENGTH_BYTES);
  crypto.getRandomValues(iv);

  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    siteKek,
    dek,
  );

  // 3. Zero plaintext DEK from memory (defense in depth — GC will reclaim,
  //    but we want no residual bytes in a live Uint8Array).
  dek.fill(0);

  return {
    encryptedDek: new Uint8Array(wrapped),
    iv,
    kekVersion,
  };
};

export interface UnwrapMemberDekParams {
  readonly encryptedDek: Uint8Array;
  readonly iv: Uint8Array;
}

/**
 * Unwrap an EncryptedMemberDEK back into a usable AES-GCM CryptoKey.
 * Throws if the wrap was tampered with or the wrong KEK is supplied
 * (AES-GCM auth tag verification).
 *
 * The returned key is **non-extractable** — its raw bytes never leave WebCrypto.
 */
export const unwrapMemberDek = async (
  siteKek: webcrypto.CryptoKey,
  params: UnwrapMemberDekParams,
): Promise<webcrypto.CryptoKey> => {
  const { encryptedDek, iv } = params;

  if (encryptedDek.byteLength === 0) {
    // Crypto-deleted member: encryptedDek row was nulled. Surface the same
    // failure shape that callers would get from a tamper — we never recover.
    throw new Error(
      "unwrapMemberDek: encryptedDek is empty (member has been crypto-deleted or never provisioned)",
    );
  }

  const dekRaw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    siteKek,
    encryptedDek,
  );

  return crypto.subtle.importKey(
    "raw",
    dekRaw,
    { name: "AES-GCM", length: 256 },
    /* extractable */ false,
    ["encrypt", "decrypt"],
  );
};
