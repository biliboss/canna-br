import type { webcrypto } from "node:crypto";

/**
 * Field-level AES-256-GCM encryption with a Member DEK.
 *
 * The IV is random per-encryption (96-bit, NIST recommendation) and stored
 * alongside the ciphertext. AES-GCM auth tag is appended to the ciphertext
 * by WebCrypto — decryption fails (throws) on tamper or wrong key.
 */

const DEFAULT_IV_LENGTH_BYTES = 12;

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export interface EncryptedField {
  readonly ciphertext: Uint8Array;
  readonly iv: Uint8Array;
}

/**
 * Encrypt a UTF-8 string with the Member DEK.
 * `ivLength` defaults to 12 bytes (96 bits) — strongly recommended for GCM.
 */
export const encryptField = async (
  memberDek: webcrypto.CryptoKey,
  plaintext: string,
  ivLength: number = DEFAULT_IV_LENGTH_BYTES,
): Promise<EncryptedField> => {
  if (!Number.isInteger(ivLength) || ivLength < 12 || ivLength > 16) {
    throw new Error(
      "encryptField: ivLength must be an integer between 12 and 16 bytes",
    );
  }

  const iv = new Uint8Array(ivLength);
  crypto.getRandomValues(iv);

  const data = utf8Encoder.encode(plaintext);

  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    memberDek,
    data,
  );

  return {
    ciphertext: new Uint8Array(ct),
    iv,
  };
};

/**
 * Decrypt a Member-DEK-encrypted field back to UTF-8 string.
 * Throws on auth-tag failure (tamper / wrong DEK / wrong IV).
 */
export const decryptField = async (
  memberDek: webcrypto.CryptoKey,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Promise<string> => {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    memberDek,
    ciphertext,
  );

  return utf8Decoder.decode(new Uint8Array(plain));
};
