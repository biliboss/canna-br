import {
  domainError,
  err,
  isDomainError,
  isOk,
  ok,
  quantityGrams,
  subtractGrams,
  addGrams,
  type DomainError,
  type DomainEvent,
  type QuantityGrams,
} from "@canna/shared";
import type { CannaEventStore } from "@canna/event-store";
import { StreamVersionConflictError } from "@canna/event-store";
import { Dispensation } from "@canna/domain";
import { loadMemberState } from "./membership-service.js";
import { loadLotState } from "./inventory-service.js";
import type { CommandResult } from "./result.js";

const associationStream = (associationId: string) =>
  `association:${associationId}:dispensations`;

const monthOf = (d: Date): string =>
  `${String(d.getUTCFullYear())}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

const ZERO = (() => {
  const r = quantityGrams(0);
  if (!isOk(r)) throw new Error("0 grams should always be valid");
  return r.value;
})();

interface DispensationProjection {
  readonly quotaConsumedByMemberMonth: ReadonlyMap<string, QuantityGrams>;
  readonly lotQuantityDeducted: ReadonlyMap<string, QuantityGrams>;
}

const isMemberQuotaConsumed = (
  e: DomainEvent<string, unknown>,
): e is DomainEvent<
  "MemberQuotaConsumed",
  {
    readonly memberId: string;
    readonly month: string;
    readonly quantityG: QuantityGrams;
  }
> => e.type === "MemberQuotaConsumed";

const isLotQuantityDeducted = (
  e: DomainEvent<string, unknown>,
): e is DomainEvent<
  "LotQuantityDeducted",
  { readonly lotId: string; readonly quantityG: QuantityGrams }
> => e.type === "LotQuantityDeducted";

const projectAssociationStream = (
  events: readonly DomainEvent<string, unknown>[],
): DispensationProjection => {
  const quota = new Map<string, QuantityGrams>();
  const lot = new Map<string, QuantityGrams>();
  for (const e of events) {
    if (isMemberQuotaConsumed(e)) {
      const key = `${e.payload.memberId}|${e.payload.month}`;
      const prev = quota.get(key) ?? ZERO;
      quota.set(key, addGrams(prev, e.payload.quantityG));
      continue;
    }
    if (isLotQuantityDeducted(e)) {
      const prev = lot.get(e.payload.lotId) ?? ZERO;
      lot.set(e.payload.lotId, addGrams(prev, e.payload.quantityG));
    }
  }
  return {
    quotaConsumedByMemberMonth: quota,
    lotQuantityDeducted: lot,
  };
};

const buildContext = async (
  store: CannaEventStore,
  cmd: Dispensation.RecordDispensation,
  responsavelTecnicoId: string | null,
  dispenserRole: "DISPENSADOR" | "RESPONSAVEL_TECNICO" | "ADMIN" | "OTHER",
): Promise<{
  readonly ctx: Dispensation.DispensationContext;
  readonly streamVersion: bigint;
  readonly month: string;
}> => {
  const month = monthOf(cmd.now);

  const member = await loadMemberState(store, cmd.memberId);
  const lot = await loadLotState(store, cmd.lotId);

  const { events, currentStreamVersion } = await store.readStream(
    associationStream(cmd.associationId),
  );
  const projection = projectAssociationStream(events);

  const quotaConsumed =
    projection.quotaConsumedByMemberMonth.get(`${cmd.memberId}|${month}`) ??
    ZERO;

  const lotDeducted = projection.lotQuantityDeducted.get(cmd.lotId) ?? ZERO;

  // Lot remaining = stream-level quantity (LotCreated) minus deductions across
  // dispensations. Lot stream itself does not track per-dispensation
  // deductions in v0.2 spike.
  const lotRemaining =
    lot.state.quantityG === null
      ? null
      : (() => {
          const sub = subtractGrams(lot.state.quantityG, lotDeducted);
          return isOk(sub) ? sub.value : ZERO;
        })();

  const ctx: Dispensation.DispensationContext = {
    member: member.state,
    lot: {
      ...lot.state,
      quantityG: lotRemaining,
    },
    month,
    quotaConsumedThisMonthG: quotaConsumed,
    dispenserRole,
    responsavelTecnicoId,
  };

  return { ctx, streamVersion: currentStreamVersion, month };
};

export interface RecordDispensationDeps {
  readonly store: CannaEventStore;
  readonly responsavelTecnicoId: string | null;
  readonly dispenserRole: "DISPENSADOR" | "RESPONSAVEL_TECNICO" | "ADMIN" | "OTHER";
  /** Max retries on optimistic concurrency conflict. */
  readonly maxRetries?: number;
}

/**
 * Record dispensation: orchestrates Member + Lot + Quota context load, calls
 * domain decide(), and atomically appends emitted events to the association
 * stream with optimistic concurrency.
 *
 * On stream version conflict, retries up to `maxRetries` (default 3) by
 * reloading context. Per ADR-001 + INV-D2: regulatory state changes are
 * synchronous and atomic.
 */
export const recordDispensation = async (
  deps: RecordDispensationDeps,
  cmd: Dispensation.RecordDispensation,
): Promise<CommandResult<Dispensation.DispensationEvent>> => {
  const maxRetries = deps.maxRetries ?? 3;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const { ctx, streamVersion } = await buildContext(
      deps.store,
      cmd,
      deps.responsavelTecnicoId,
      deps.dispenserRole,
    );

    const result = Dispensation.decide(cmd, ctx);
    if (isDomainError(result)) {
      return err(result);
    }

    const stream = associationStream(cmd.associationId);
    const expectedVersion = streamVersion === 0n ? ("none" as const) : streamVersion;

    try {
      const appended = await deps.store.appendToStream<Dispensation.DispensationEvent>(
        stream,
        result,
        expectedVersion,
      );
      return ok({ events: result, nextVersion: appended.nextExpectedVersion });
    } catch (e) {
      if (e instanceof StreamVersionConflictError) {
        attempt += 1;
        continue;
      }
      throw e;
    }
  }

  return err(
    domainError(
      "STREAM_CONFLICT_EXHAUSTED",
      `Failed to append dispensation after ${String(maxRetries)} retries`,
      { dispensationId: cmd.dispensationId, associationId: cmd.associationId },
    ),
  );
};

export const loadAssociationDispensations = async (
  store: CannaEventStore,
  associationId: string,
) => {
  const { events, currentStreamVersion } = await store.readStream(
    associationStream(associationId),
  );
  return { events, currentStreamVersion };
};

// Suppress unused warning if someone imports DomainError type
export type _Reserved = DomainError;
