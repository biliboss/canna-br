import type { webcrypto } from "node:crypto";

/**
 * Site KEK (Key Encryption Key) derivation.
 *
 * Hierarchy (envelope encryption):
 *   Master Key  (HashiCorp Vault / cifrada no deploy Kamal — NUNCA em DB)
 *     └── Site KEK   (HKDF-SHA256 sobre Master Key + site_id + version)
 *           └── Member DEK   (random 256-bit, wrapped com Site KEK)
 *                 └── AES-256-GCM(dado sensível, DEK)
 *
 * Site KEK NUNCA cifra dados diretamente — só cifra DEKs.
 * Rotação trimestral (jan/abr/jul/out) → `version` incrementa, todas DEKs são re-wrapped.
 *
 * Em produção `masterKey` vem do Vault ou env cifrado. Em testes passamos
 * um buffer fixo determinístico.
 */

const HKDF_HASH = "SHA-256";
const HKDF_INFO_PREFIX = "canna-oss/site-kek/v";
const KEK_LENGTH_BITS = 256;

export interface DeriveSiteKekParams {
  readonly masterKey: Uint8Array;
  readonly siteId: string;
  /** Monotonic — bumped at each quarterly rotation. */
  readonly version: number;
}

const utf8 = new TextEncoder();

/**
 * Derive a tenant-scoped Site KEK from the Master Key via HKDF-SHA256.
 *
 * The returned `CryptoKey` is configured for AES-GCM wrap/unwrap of DEKs.
 * It is **non-extractable** — the raw bytes never leave WebCrypto after derivation.
 */
export const deriveSiteKek = async (
  params: DeriveSiteKekParams,
): Promise<webcrypto.CryptoKey> => {
  const { masterKey, siteId, version } = params;

  if (masterKey.byteLength < 32) {
    throw new Error(
      "deriveSiteKek: masterKey must be at least 32 bytes (256 bits) of high-entropy material",
    );
  }
  if (siteId.length === 0) {
    throw new Error("deriveSiteKek: siteId must be a non-empty string");
  }
  if (!Number.isInteger(version) || version < 0) {
    throw new Error("deriveSiteKek: version must be a non-negative integer");
  }

  // Import master key for HKDF.
  const ikm = await crypto.subtle.importKey(
    "raw",
    masterKey,
    "HKDF",
    /* extractable */ false,
    ["deriveKey"],
  );

  // Salt = site_id bytes (tenant boundary).
  // Info = version-tagged label so each rotation produces an independent KEK.
  const salt = utf8.encode(`canna-oss/site/${siteId}`);
  const info = utf8.encode(`${HKDF_INFO_PREFIX}${version.toString()}`);

  const kek = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: HKDF_HASH,
      salt,
      info,
    },
    ikm,
    { name: "AES-GCM", length: KEK_LENGTH_BITS },
    /* extractable */ false,
    ["encrypt", "decrypt"],
  );

  return kek;
};
