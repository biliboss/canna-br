import { describe, it, expect } from "vitest";
import {
  buildCryptoDeleteMutation,
  createMemberDek,
  cryptoDeleteSpec,
  decryptField,
  deriveSiteKek,
  encryptField,
  hashCpf,
  unwrapMemberDek,
  type CryptoDeleteAuditEntry,
  type CryptoDeleteMutation,
  type CryptoDeleteMutator,
} from "../index.js";

// Fixed master key for deterministic tests. In prod this lives in Vault.
const TEST_MASTER_KEY = new Uint8Array(32).map((_, i) => (i * 7 + 11) & 0xff);
const OTHER_MASTER_KEY = new Uint8Array(32).map((_, i) => (i * 13 + 5) & 0xff);

describe("@canna/crypto — Site KEK derivation", () => {
  it("is deterministic for the same (masterKey, siteId, version)", async () => {
    const k1 = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    const k2 = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    // Roundtrip proof: ciphertext from k1 must decrypt under k2.
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const probe = new TextEncoder().encode("ping");
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k1, probe);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, k2, ct);
    expect(new TextDecoder().decode(pt)).toBe("ping");
  });

  it("changes when version increments (quarterly rotation)", async () => {
    const v1 = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    const v2 = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 2,
    });
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const probe = new TextEncoder().encode("ping");
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, v1, probe);
    // v2 cannot decrypt v1's ciphertext — rotation produced an independent KEK.
    await expect(
      crypto.subtle.decrypt({ name: "AES-GCM", iv }, v2, ct),
    ).rejects.toThrow();
  });

  it("changes when siteId differs (tenant isolation)", async () => {
    const a = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-aaa",
      version: 1,
    });
    const b = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-bbb",
      version: 1,
    });
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const probe = new TextEncoder().encode("ping");
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, a, probe);
    await expect(
      crypto.subtle.decrypt({ name: "AES-GCM", iv }, b, ct),
    ).rejects.toThrow();
  });

  it("rejects short master keys", async () => {
    await expect(
      deriveSiteKek({
        masterKey: new Uint8Array(16),
        siteId: "site-001",
        version: 1,
      }),
    ).rejects.toThrow(/at least 32 bytes/);
  });
});

describe("@canna/crypto — Member DEK envelope", () => {
  it("createMemberDek produces a different encryptedDek each call (random DEK)", async () => {
    const kek = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    const a = await createMemberDek({ siteKek: kek, kekVersion: 1 });
    const b = await createMemberDek({ siteKek: kek, kekVersion: 1 });
    expect(a.encryptedDek).not.toEqual(b.encryptedDek);
    expect(a.iv).not.toEqual(b.iv);
    expect(a.kekVersion).toBe(1);
  });

  it("unwrap roundtrip yields a usable DEK", async () => {
    const kek = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    const wrapped = await createMemberDek({ siteKek: kek, kekVersion: 1 });
    const dek = await unwrapMemberDek(kek, {
      encryptedDek: wrapped.encryptedDek,
      iv: wrapped.iv,
    });
    // Round-trip a payload to prove the DEK is usable.
    const { ciphertext, iv } = await encryptField(dek, "hello");
    expect(await decryptField(dek, ciphertext, iv)).toBe("hello");
  });

  it("unwrap with wrong Site KEK throws (rotation safety)", async () => {
    const kekV1 = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    const kekV2 = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 2,
    });
    const wrapped = await createMemberDek({ siteKek: kekV1, kekVersion: 1 });
    await expect(
      unwrapMemberDek(kekV2, {
        encryptedDek: wrapped.encryptedDek,
        iv: wrapped.iv,
      }),
    ).rejects.toThrow();
  });
});

describe("@canna/crypto — Field encryption", () => {
  it("encrypt then decrypt returns the original plaintext (UTF-8)", async () => {
    const kek = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    const wrapped = await createMemberDek({ siteKek: kek, kekVersion: 1 });
    const dek = await unwrapMemberDek(kek, {
      encryptedDek: wrapped.encryptedDek,
      iv: wrapped.iv,
    });

    const plaintext = "Maria José — condição: dor crônica neuropática";
    const { ciphertext, iv } = await encryptField(dek, plaintext);
    const back = await decryptField(dek, ciphertext, iv);
    expect(back).toBe(plaintext);
  });

  it("decrypt with WRONG DEK throws (AES-GCM auth tag failure)", async () => {
    const kek = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    const wrappedA = await createMemberDek({ siteKek: kek, kekVersion: 1 });
    const wrappedB = await createMemberDek({ siteKek: kek, kekVersion: 1 });
    const dekA = await unwrapMemberDek(kek, {
      encryptedDek: wrappedA.encryptedDek,
      iv: wrappedA.iv,
    });
    const dekB = await unwrapMemberDek(kek, {
      encryptedDek: wrappedB.encryptedDek,
      iv: wrappedB.iv,
    });
    const { ciphertext, iv } = await encryptField(dekA, "secret");
    await expect(decryptField(dekB, ciphertext, iv)).rejects.toThrow();
  });

  it("rejects invalid IV length", async () => {
    const kek = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    const wrapped = await createMemberDek({ siteKek: kek, kekVersion: 1 });
    const dek = await unwrapMemberDek(kek, {
      encryptedDek: wrapped.encryptedDek,
      iv: wrapped.iv,
    });
    await expect(encryptField(dek, "hi", 8)).rejects.toThrow(/ivLength/);
  });
});

describe("@canna/crypto — CPF hash", () => {
  const SITE_SALT_A = "tenant-aaa-salt-1f3e";
  const SITE_SALT_B = "tenant-bbb-salt-9c4d";

  it("is deterministic for the same (cpf, siteSalt)", async () => {
    const h1 = await hashCpf("123.456.789-00", SITE_SALT_A);
    const h2 = await hashCpf("123.456.789-00", SITE_SALT_A);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("normalizes punctuation — `123.456.789-00` and `12345678900` produce same hash", async () => {
    const formatted = await hashCpf("123.456.789-00", SITE_SALT_A);
    const bare = await hashCpf("12345678900", SITE_SALT_A);
    const spaced = await hashCpf("123 456 789 00", SITE_SALT_A);
    expect(formatted).toBe(bare);
    expect(formatted).toBe(spaced);
  });

  it("differs when site_salt differs (cross-tenant isolation)", async () => {
    const inA = await hashCpf("12345678900", SITE_SALT_A);
    const inB = await hashCpf("12345678900", SITE_SALT_B);
    expect(inA).not.toBe(inB);
  });

  it("rejects empty site salt", async () => {
    await expect(hashCpf("12345678900", "")).rejects.toThrow(/siteSalt/);
  });
});

describe("@canna/crypto — Crypto-deletion (Art. 18 IV LGPD)", () => {
  it("calls the injected mutator with the canonical mutation payload + audit", async () => {
    const captured: {
      memberId?: string;
      mutation?: CryptoDeleteMutation;
      audit?: CryptoDeleteAuditEntry;
    } = {};

    const mutator: CryptoDeleteMutator = async (args) => {
      captured.memberId = args.memberId;
      captured.mutation = args.mutation;
      captured.audit = args.audit;
    };

    const fixedAt = new Date("2026-06-08T12:00:00.000Z");
    const result = await cryptoDeleteSpec({
      memberId: "01J8AAAAAAAAAAAAAAAAAAAAAA",
      actorId: "01J8DDDDDDDDDDDDDDDDDDDDDD",
      actorRole: "dpo",
      now: () => fixedAt,
      dbMutator: mutator,
    });

    expect(result.done).toBe(true);
    expect(result.memberId).toBe("01J8AAAAAAAAAAAAAAAAAAAAAA");

    // Mutator received the canonical payload.
    expect(captured.memberId).toBe("01J8AAAAAAAAAAAAAAAAAAAAAA");
    expect(captured.mutation).toEqual(buildCryptoDeleteMutation(fixedAt));
    expect(captured.mutation?.status).toBe("crypto_deleted");
    expect(captured.mutation?.encryptedMemberDek).toBeNull();
    expect(captured.mutation?.encryptedMemberDekIv).toBeNull();
    expect(captured.mutation?.encryptedMemberDekKekVersion).toBeNull();
    expect(captured.mutation?.cpfHash).toBeNull();

    // Audit entry shape is locked.
    expect(captured.audit?.tableName).toBe("members");
    expect(captured.audit?.action).toBe("CRYPTO_DELETE");
    expect(captured.audit?.actorRole).toBe("dpo");
    expect(captured.audit?.reason).toMatch(/Art\. 18 IV/);
    expect(captured.audit?.at).toEqual(fixedAt);
  });

  it("propagates mutator failure (rollback responsibility stays with caller)", async () => {
    const boom: CryptoDeleteMutator = async () => {
      throw new Error("db connection lost");
    };
    await expect(
      cryptoDeleteSpec({
        memberId: "m1",
        actorId: "a1",
        actorRole: "dpo",
        dbMutator: boom,
      }),
    ).rejects.toThrow(/db connection lost/);
  });

  it("after crypto-delete, decrypt is impossible (encryptedDek destroyed → unwrap throws)", async () => {
    // 1. Bootstrap a member's envelope.
    const kek = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    const wrapped = await createMemberDek({ siteKek: kek, kekVersion: 1 });
    const dek = await unwrapMemberDek(kek, {
      encryptedDek: wrapped.encryptedDek,
      iv: wrapped.iv,
    });
    const { ciphertext, iv } = await encryptField(dek, "diagnóstico sensível");

    // 2. Simulate DB state after crypto-delete: encryptedDek row is NULL.
    // We model this by zeroing-out the stored bytes (representing the row going away).
    const stored: { encryptedDek: Uint8Array | null; iv: Uint8Array | null } = {
      encryptedDek: wrapped.encryptedDek,
      iv: wrapped.iv,
    };

    // Run the orchestration with a mutator that wipes the local "DB" snapshot.
    await cryptoDeleteSpec({
      memberId: "m1",
      actorId: "dpo-1",
      actorRole: "dpo",
      dbMutator: async () => {
        stored.encryptedDek = null;
        stored.iv = null;
      },
    });

    expect(stored.encryptedDek).toBeNull();
    expect(stored.iv).toBeNull();

    // 3. Attempt to unwrap from the destroyed row → throws.
    await expect(
      unwrapMemberDek(kek, {
        encryptedDek: new Uint8Array(0),
        iv: new Uint8Array(0),
      }),
    ).rejects.toThrow();

    // 4. Ciphertext still exists in storage but is now computational noise:
    // without the DEK there is no way to decrypt it. We assert this by
    // confirming a freshly-minted DEK (different random bytes) cannot
    // recover the plaintext.
    const freshWrapped = await createMemberDek({ siteKek: kek, kekVersion: 1 });
    const freshDek = await unwrapMemberDek(kek, {
      encryptedDek: freshWrapped.encryptedDek,
      iv: freshWrapped.iv,
    });
    await expect(decryptField(freshDek, ciphertext, iv)).rejects.toThrow();
  });

  it("also blocks recovery via a different Master Key (defense in depth)", async () => {
    const kek = await deriveSiteKek({
      masterKey: TEST_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    const wrapped = await createMemberDek({ siteKek: kek, kekVersion: 1 });

    // Attacker holds the encryptedDek + iv but tries a wrong Master Key.
    const wrongKek = await deriveSiteKek({
      masterKey: OTHER_MASTER_KEY,
      siteId: "site-001",
      version: 1,
    });
    await expect(
      unwrapMemberDek(wrongKek, {
        encryptedDek: wrapped.encryptedDek,
        iv: wrapped.iv,
      }),
    ).rejects.toThrow();
  });
});
