import { describe, expect, it } from "vitest";
import type { Membership } from "@canna/domain";

import {
  TEST_IDS,
  consentGranted,
  dispensationRecorded,
  lotCreated,
  lotReleased,
  memberRegistered,
  prescriptionValidated,
} from "./factories.js";

describe("domain factories", () => {
  it("memberRegistered: valid defaults, typed payload", () => {
    const e = memberRegistered();
    expect(e.type).toBe("MemberRegistered");
    expect(e.version).toBe(1);
    expect(e.streamId).toBe(`member:${e.payload.memberId}`);
    expect(e.payload.associationId).toBe(TEST_IDS.association);
    expect(e.payload.cpfHash).toMatch(/^sha256:/);
  });

  it("applies shallow payload overrides", () => {
    const e = memberRegistered({ cpfHash: "sha256:custom" });
    expect(e.payload.cpfHash).toBe("sha256:custom");
    // unchanged defaults survive
    expect(e.payload.registeredBy).toBe(TEST_IDS.actor);
  });

  it("is deterministic: same overrides => structurally identical", () => {
    const a = memberRegistered({ memberId: TEST_IDS.actor });
    const b = memberRegistered({ memberId: TEST_IDS.actor });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("consentGranted reuses the member stream", () => {
    const reg = memberRegistered();
    const grant = consentGranted({ memberId: reg.payload.memberId });
    expect(grant.streamId).toBe(reg.streamId);
    expect(grant.payload.consentVersion).toBe(1);
  });

  it("lot factories share a lot stream and produce RELEASED-capable pair", () => {
    const created = lotCreated();
    const released = lotReleased({ lotId: created.payload.lotId });
    expect(released.streamId).toBe(created.streamId);
    expect(created.payload.initialQuantityG).toBe(500);
  });

  it("prescriptionValidated carries a quota and physician", () => {
    const e = prescriptionValidated();
    expect(e.payload.monthlyQuotaG).toBe(40);
    expect(e.payload.validatedBy).toBe(TEST_IDS.physician);
  });

  it("dispensationRecorded streams under the association", () => {
    const e = dispensationRecorded();
    expect(e.streamId).toBe(
      `association:${e.payload.associationId}:dispensations`,
    );
    expect(e.payload.approvedBy).toBeNull();
  });

  it("factory output is assignable to the real domain type", () => {
    // compile-time proof: widening to the domain union must hold.
    const e: Membership.MemberEvent = memberRegistered();
    expect(e.type).toBe("MemberRegistered");
  });
});
