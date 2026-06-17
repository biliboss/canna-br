import { describe, it, expect } from "vitest";
import { domainError, isOk, quantityGrams, type ULID } from "@canna/shared";
import { scenario } from "@canna/test-utils";
import { decide } from "./decide.js";
import { evolve } from "./evolve.js";
import { emptyLotState } from "./state.js";
import type {
  InventoryEvent,
  LotCreated,
  LotReleased,
  LotQuantityDeducted,
  LotExhausted,
  LotInsufficientQuantity,
  LotQuarantined,
  LotRecalled,
} from "./events.js";
import type { InventoryCommand } from "./commands.js";

const LOT_ID = "01HM0LOT00000000000000001" as ULID;
const ASSOC_ID = "01HM0ASSOC0000000000000001" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const DISP_ID = "01HM0DISP00000000000000001" as ULID;
const NOW = new Date("2026-06-08T12:00:00Z");
const PRODUCED = new Date("2026-04-01T00:00:00Z");
const EXPIRES = new Date("2027-04-01T00:00:00Z");

const grams = (n: number) => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(`bad ${String(n)}`);
  return r.value;
};

const baseEvent = <T extends string, P>(
  type: T,
  payload: P,
): { type: T; version: 1; streamId: string; occurredAt: Date; payload: P } => ({
  type,
  version: 1,
  streamId: `lot:${LOT_ID}`,
  occurredAt: NOW,
  payload,
});

const lotCreated = (initialG = 100): LotCreated =>
  baseEvent("LotCreated", {
    lotId: LOT_ID,
    associationId: ASSOC_ID,
    productSku: "CBD-FULL-SPECTRUM-200MG-30ML",
    initialQuantityG: grams(initialG),
    origin: "INTERNAL_CULTIVATION",
    producedAt: PRODUCED,
    expiresAt: EXPIRES,
    createdBy: ACTOR,
  });

const lotReleased = (): LotReleased =>
  baseEvent("LotReleased", {
    lotId: LOT_ID,
    coaReference: "coa://lab-abc/2026-04/lot-001",
    releasedBy: ACTOR,
  });

const lotQuarantined = (
  reason = "fora de especificação",
): LotQuarantined =>
  baseEvent("LotQuarantined", {
    lotId: LOT_ID,
    reason,
    quarantinedBy: ACTOR,
  });

const lotRecalled = (): LotRecalled =>
  baseEvent("LotRecalled", {
    lotId: LOT_ID,
    reason: "alerta sanitário",
    recalledBy: ACTOR,
  });

const lotDeducted = (
  amountG: number,
  beforeG: number,
  afterG: number,
): LotQuantityDeducted =>
  baseEvent("LotQuantityDeducted", {
    lotId: LOT_ID,
    dispensationId: DISP_ID,
    quantityG: grams(amountG),
    quantityBeforeG: grams(beforeG),
    quantityAfterG: grams(afterG),
    deductedBy: ACTOR,
  });

const lotExhausted = (): LotExhausted =>
  baseEvent("LotExhausted", { lotId: LOT_ID });

const lotInsufficient = (
  attempt: number,
  remaining: number,
): LotInsufficientQuantity =>
  baseEvent("LotInsufficientQuantity", {
    lotId: LOT_ID,
    attemptedQuantityG: grams(attempt),
    lotRemainingG: grams(remaining),
    attemptedBy: ACTOR,
  });

const run = (
  given: readonly InventoryEvent[],
  cmd: InventoryCommand,
  then: readonly InventoryEvent[] | ReturnType<typeof domainError>,
) =>
  scenario({
    initial: emptyLotState,
    given,
    when: cmd,
    then,
    decide,
    evolve,
  });

describe("Inventory / CreateLot", () => {
  it("GIVEN no events / WHEN CreateLot / THEN LotCreated (QUARANTINED)", () => {
    run(
      [],
      {
        type: "CreateLot",
        lotId: LOT_ID,
        associationId: ASSOC_ID,
        productSku: "CBD-FULL-SPECTRUM-200MG-30ML",
        initialQuantityG: grams(100),
        origin: "INTERNAL_CULTIVATION",
        producedAt: PRODUCED,
        expiresAt: EXPIRES,
        createdBy: ACTOR,
        now: NOW,
      },
      [lotCreated(100)],
    );
  });

  it("rejects double creation", () => {
    run(
      [lotCreated()],
      {
        type: "CreateLot",
        lotId: LOT_ID,
        associationId: ASSOC_ID,
        productSku: "X",
        initialQuantityG: grams(50),
        origin: "INTERNAL_CULTIVATION",
        producedAt: PRODUCED,
        expiresAt: EXPIRES,
        createdBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_ALREADY_EXISTS", "ignored"),
    );
  });

  it("rejects invalid date window", () => {
    run(
      [],
      {
        type: "CreateLot",
        lotId: LOT_ID,
        associationId: ASSOC_ID,
        productSku: "X",
        initialQuantityG: grams(50),
        origin: "INTERNAL_CULTIVATION",
        producedAt: EXPIRES,
        expiresAt: PRODUCED,
        createdBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_INVALID_DATES", "ignored"),
    );
  });
});

describe("Inventory / ReleaseLot", () => {
  it("QUARANTINED → released", () => {
    run(
      [lotCreated()],
      {
        type: "ReleaseLot",
        lotId: LOT_ID,
        coaReference: "coa://lab-abc/2026-04/lot-001",
        releasedBy: ACTOR,
        now: NOW,
      },
      [lotReleased()],
    );
  });

  it("AVAILABLE cannot be released again", () => {
    run(
      [lotCreated(), lotReleased()],
      {
        type: "ReleaseLot",
        lotId: LOT_ID,
        coaReference: "x",
        releasedBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_NOT_QUARANTINED", "ignored"),
    );
  });
});

describe("Inventory / DeductLotQuantity", () => {
  it("AVAILABLE + quantity sufficient → LotQuantityDeducted", () => {
    run(
      [lotCreated(100), lotReleased()],
      {
        type: "DeductLotQuantity",
        lotId: LOT_ID,
        dispensationId: DISP_ID,
        quantityG: grams(25),
        deductedBy: ACTOR,
        now: NOW,
      },
      [lotDeducted(25, 100, 75)],
    );
  });

  it("exact remaining → LotQuantityDeducted + LotExhausted", () => {
    run(
      [lotCreated(30), lotReleased()],
      {
        type: "DeductLotQuantity",
        lotId: LOT_ID,
        dispensationId: DISP_ID,
        quantityG: grams(30),
        deductedBy: ACTOR,
        now: NOW,
      },
      [lotDeducted(30, 30, 0), lotExhausted()],
    );
  });

  it("insufficient quantity → LotInsufficientQuantity (no state mutation)", () => {
    run(
      [lotCreated(10), lotReleased()],
      {
        type: "DeductLotQuantity",
        lotId: LOT_ID,
        dispensationId: DISP_ID,
        quantityG: grams(25),
        deductedBy: ACTOR,
        now: NOW,
      },
      [lotInsufficient(25, 10)],
    );
  });

  it("QUARANTINED lot rejects deduction", () => {
    run(
      [lotCreated()],
      {
        type: "DeductLotQuantity",
        lotId: LOT_ID,
        dispensationId: DISP_ID,
        quantityG: grams(10),
        deductedBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_NOT_AVAILABLE", "ignored"),
    );
  });

  it("RECALLED lot rejects deduction", () => {
    run(
      [lotCreated(), lotReleased(), lotRecalled()],
      {
        type: "DeductLotQuantity",
        lotId: LOT_ID,
        dispensationId: DISP_ID,
        quantityG: grams(10),
        deductedBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_NOT_AVAILABLE", "ignored"),
    );
  });
});

describe("Inventory / Quarantine & Recall", () => {
  it("AVAILABLE can be re-quarantined", () => {
    run(
      [lotCreated(), lotReleased()],
      {
        type: "QuarantineLot",
        lotId: LOT_ID,
        reason: "suspeita",
        quarantinedBy: ACTOR,
        now: NOW,
      },
      [lotQuarantined("suspeita")],
    );
  });

  it("QUARANTINED rejects re-quarantine", () => {
    run(
      [lotCreated()],
      {
        type: "QuarantineLot",
        lotId: LOT_ID,
        reason: "x",
        quarantinedBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_ALREADY_QUARANTINED", "ignored"),
    );
  });

  it("AVAILABLE → RECALLED", () => {
    run(
      [lotCreated(), lotReleased()],
      {
        type: "RecallLot",
        lotId: LOT_ID,
        reason: "alerta sanitário",
        recalledBy: ACTOR,
        now: NOW,
      },
      [lotRecalled()],
    );
  });

  it("rejects double recall", () => {
    run(
      [lotCreated(), lotReleased(), lotRecalled()],
      {
        type: "RecallLot",
        lotId: LOT_ID,
        reason: "x",
        recalledBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_ALREADY_RECALLED", "ignored"),
    );
  });

  it("rejects quarantine of nonexistent lot → LOT_NOT_FOUND", () => {
    run(
      [],
      {
        type: "QuarantineLot",
        lotId: LOT_ID,
        reason: "x",
        quarantinedBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_NOT_FOUND", "ignored"),
    );
  });

  it("rejects quarantine of RECALLED lot → LOT_TERMINAL_STATE", () => {
    run(
      [lotCreated(), lotReleased(), lotRecalled()],
      {
        type: "QuarantineLot",
        lotId: LOT_ID,
        reason: "x",
        quarantinedBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_TERMINAL_STATE", "ignored"),
    );
  });

  it("rejects quarantine of EXHAUSTED lot → LOT_TERMINAL_STATE", () => {
    // deduct entire lot → EXHAUSTED
    run(
      [lotCreated(30), lotReleased(), lotDeducted(30, 30, 0), lotExhausted()],
      {
        type: "QuarantineLot",
        lotId: LOT_ID,
        reason: "x",
        quarantinedBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_TERMINAL_STATE", "ignored"),
    );
  });

  it("rejects recall of nonexistent lot → LOT_NOT_FOUND", () => {
    run(
      [],
      {
        type: "RecallLot",
        lotId: LOT_ID,
        reason: "x",
        recalledBy: ACTOR,
        now: NOW,
      },
      domainError("LOT_NOT_FOUND", "ignored"),
    );
  });
});

describe("Inventory / evolve idempotence & terminal transitions", () => {
  const fold = (events: readonly InventoryEvent[]) =>
    events.reduce((s, e) => evolve(s, e), emptyLotState);

  it("LotReleased applied twice converges (AVAILABLE)", () => {
    const once = fold([lotCreated(100), lotReleased()]);
    const twice = evolve(once, lotReleased());
    expect(once).toEqual(twice);
    expect(once.status).toBe("AVAILABLE");
  });

  it("LotRecalled applied twice converges (RECALLED, terminal)", () => {
    const once = fold([lotCreated(), lotReleased(), lotRecalled()]);
    const twice = evolve(once, lotRecalled());
    expect(once).toEqual(twice);
    expect(once.status).toBe("RECALLED");
  });

  it("LotExhausted applied twice converges (EXHAUSTED, terminal)", () => {
    const once = fold([lotCreated(30), lotReleased(), lotDeducted(30, 30, 0), lotExhausted()]);
    const twice = evolve(once, lotExhausted());
    expect(once).toEqual(twice);
    expect(once.status).toBe("EXHAUSTED");
  });

  it("LotInsufficientQuantity does not mutate state", () => {
    const before = fold([lotCreated(10), lotReleased()]);
    const after = evolve(before, lotInsufficient(25, 10));
    expect(after).toEqual(before);
    expect(after.quantityG).toBe(before.quantityG);
  });

  it("LotQuarantined re-applied to AVAILABLE converges to QUARANTINED", () => {
    const available = fold([lotCreated(), lotReleased()]);
    const q1 = evolve(available, lotQuarantined("a"));
    const q2 = evolve(q1, lotQuarantined("b"));
    expect(q1).toEqual(q2);
    expect(q1.status).toBe("QUARANTINED");
  });
});
