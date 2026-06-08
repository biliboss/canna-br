/**
 * CPF hashing — CPF is NEVER stored in plaintext.
 *
 * Storage shape: `SHA-256(cpf_normalized + site_salt)`, hex-encoded.
 *
 * - `site_salt` is per-tenant → same CPF produces different hashes in different
 *   tenants (cross-tenant correlation is prevented).
 * - Deduplication: hash the candidate CPF, compare against `members.cpf_hash`.
 * - On crypto-delete the row's `cpf_hash` is also nulled (defense in depth).
 *
 * Built on `crypto.subtle.digest` — pure Web Crypto, no `node:crypto`.
 */

const utf8 = new TextEncoder();

const NORMALIZE_RE = /[.\-\s]/g;

const toHex = (bytes: Uint8Array): string => {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] as number).toString(16).padStart(2, "0");
  }
  return out;
};

/**
 * Normalize and hash a CPF for dedup.
 *
 * Normalization strips dots, dashes, and whitespace —
 * `123.456.789-00` ≡ `12345678900` for hash purposes.
 */
export const hashCpf = async (
  cpf: string,
  siteSalt: string,
): Promise<string> => {
  if (siteSalt.length === 0) {
    throw new Error("hashCpf: siteSalt must be a non-empty string");
  }

  const normalized = cpf.replace(NORMALIZE_RE, "");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    utf8.encode(normalized + siteSalt),
  );

  return toHex(new Uint8Array(digest));
};
