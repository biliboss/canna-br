import {
  domainError,
  err,
  isDomainError,
  isOk,
  ok,
  quantityGrams,
  subtractGrams,
  addGrams,
  type DomainEvent,
  type QuantityGrams,
} from "@canna/shared";
import type { CannaEventStore } from "@canna/event-store";
import { StreamVersionConflictError } from "@canna/event-store";
import { Dispensation } from "@canna/domain";
import { loadMemberState } from "./membership-service.js";
import { loadLotState } from "./inventory-service.js";
import { type CommandResult, type QueryResult } from "./result.js";

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
  /** Requested-but-not-yet-effected dispensations, keyed by dispensationId. */
  readonly pendingRequests: ReadonlyMap<string, Dispensation.PendingDispensationRequest>;
}

// Type-guards bound to the NAMED domain event types (Dispensation.*). This is
// the anti-drift contract: the projection below reads `payload.month`,
// `payload.memberId`, `payload.lotId`, `payload.quantityG` through these
// narrowed types, so if the domain event shape in
// `packages/domain/src/dispensation/events.ts` ever changes, this file fails to
// typecheck instead of silently mis-projecting. Removing the exported type from
// the domain also breaks the import loudly (vs `Extract<...>` degrading to
// `never`).
const isMemberQuotaConsumed = (
  e: DomainEvent<string, unknown>,
): e is Dispensation.MemberQuotaConsumed => e.type === "MemberQuotaConsumed";

const isLotQuantityDeducted = (
  e: DomainEvent<string, unknown>,
): e is Dispensation.LotQuantityDeductedByDispensation =>
  e.type === "LotQuantityDeducted";

const isDispensationRequested = (
  e: DomainEvent<string, unknown>,
): e is Dispensation.DispensationRequested => e.type === "DispensationRequested";

const isDispensationRecorded = (
  e: DomainEvent<string, unknown>,
): e is Dispensation.DispensationRecorded => e.type === "DispensationRecorded";

const projectAssociationStream = (
  events: readonly DomainEvent<string, unknown>[],
): DispensationProjection => {
  const quota = new Map<string, QuantityGrams>();
  const lot = new Map<string, QuantityGrams>();
  const pending = new Map<string, Dispensation.PendingDispensationRequest>();
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
      continue;
    }
    if (isDispensationRequested(e)) {
      pending.set(e.payload.dispensationId, {
        dispensationId: e.payload.dispensationId,
        memberId: e.payload.memberRef,
        lotId: e.payload.inventoryLotRef,
        quantityG: e.payload.quantityG,
        requestedBy: e.payload.requestedBy,
      });
      continue;
    }
    if (isDispensationRecorded(e)) {
      // Effected → no longer pending.
      pending.delete(e.payload.dispensationId);
    }
  }
  return {
    quotaConsumedByMemberMonth: quota,
    lotQuantityDeducted: lot,
    pendingRequests: pending,
  };
};

interface ContextTarget {
  readonly associationId: string;
  readonly memberId: string;
  readonly lotId: string;
  readonly now: Date;
}

const buildContext = async (
  store: CannaEventStore,
  cmd: ContextTarget,
  responsavelTecnicoId: string | null,
  dispenserRole: "DISPENSADOR" | "RESPONSAVEL_TECNICO" | "ADMIN" | "OTHER",
): Promise<{
  readonly ctx: Dispensation.DispensationContext;
  readonly streamVersion: bigint;
  readonly month: string;
  readonly pendingRequests: ReadonlyMap<
    string,
    Dispensation.PendingDispensationRequest
  >;
}> => {
  const month = monthOf(cmd.now);

  const member = await loadMemberState(store, cmd.memberId);
  const lot = await loadLotState(store, cmd.lotId);

  // App-layer inline projection (intentional, NOT a leftover spike).
  //
  // We fold the full association `dispensations` stream here — rather than
  // reading the pg `member_quota` read-model added in wave.4 (commit 6b3cda3)
  // — because this is the *write path*: `decide()` must validate quota/lot
  // against state that is consistent with the SAME stream version we then
  // append to under optimistic concurrency (INV-D2, synchronous + atomic per
  // ADR-001). The pg read-model is eventually-consistent and projected
  // asynchronously, so reading it here would reintroduce the very TOCTOU race
  // the optimistic-concurrency retry loop exists to close.
  //
  // The pg read-model remains the correct source for read-only tools/UI
  // (e.g. get_member_quota); the write path deliberately re-folds the stream.
  // TODO(wave.>4): if a strongly-consistent quota read-model lands, revisit.
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

  return {
    ctx,
    streamVersion: currentStreamVersion,
    month,
    pendingRequests: projection.pendingRequests,
  };
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

export interface RequestDispensationDeps {
  readonly store: CannaEventStore;
  readonly dispenserRole: "DISPENSADOR" | "RESPONSAVEL_TECNICO" | "ADMIN" | "OTHER";
  readonly maxRetries?: number;
}

/**
 * RDC 1.014 — Step 1. Records a PENDING dispensation request (no quota/lot
 * mutation). Light validation via `decideRequest`; appends a single
 * `DispensationRequested` event under optimistic concurrency.
 */
export const requestDispensation = async (
  deps: RequestDispensationDeps,
  cmd: Dispensation.RequestDispensation,
): Promise<CommandResult<Dispensation.DispensationEvent>> => {
  const maxRetries = deps.maxRetries ?? 3;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const { ctx, streamVersion } = await buildContext(
      deps.store,
      cmd,
      null,
      deps.dispenserRole,
    );

    const result = Dispensation.decideRequest(cmd, ctx);
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
      `Failed to request dispensation after ${String(maxRetries)} retries`,
      { dispensationId: cmd.dispensationId, associationId: cmd.associationId },
    ),
  );
};

export interface ApproveDispensationDeps {
  readonly store: CannaEventStore;
  /** Role of the approver — RBAC is enforced at the tool layer; the domain
   * effect runs as the original DISPENSADOR. */
  readonly approverRole: "RESPONSAVEL_TECNICO" | "DIRETORIA";
  readonly maxRetries?: number;
}

/**
 * RDC 1.014 — Step 2. A distinct approver effects a pending request. The
 * original request (member/lot/quantity/requester) is recovered from the
 * stored `DispensationRequested` event in the stream — never from caller input.
 * Segregation is enforced in `decideApprove` (delegates to the effect decider
 * with `dispensedBy = requester`, `approvedBy = approver`). On success appends
 * DispensationRecorded + MemberQuotaConsumed + LotQuantityDeducted atomically.
 */
export const approveDispensation = async (
  deps: ApproveDispensationDeps,
  cmd: Dispensation.ApproveDispensation,
): Promise<CommandResult<Dispensation.DispensationEvent>> => {
  const maxRetries = deps.maxRetries ?? 3;
  let attempt = 0;

  while (attempt <= maxRetries) {
    // Peek the pending request first to discover member/lot for the context load.
    const { events: streamEvents } = await deps.store.readStream(
      associationStream(cmd.associationId),
    );
    const pending = projectAssociationStream(streamEvents).pendingRequests.get(
      cmd.dispensationId,
    );
    if (pending == null) {
      return err(
        domainError(
          "PENDING_DISPENSATION_NOT_FOUND",
          "No pending dispensation request found for this id",
          { dispensationId: cmd.dispensationId },
        ),
      );
    }

    const { ctx, streamVersion, pendingRequests } = await buildContext(
      deps.store,
      {
        associationId: cmd.associationId,
        memberId: pending.memberId,
        lotId: pending.lotId,
        now: cmd.now,
      },
      // Effect runs as the original DISPENSADOR (segregation is by identity).
      null,
      "DISPENSADOR",
    );

    const effectCtx: Dispensation.DispensationContext = {
      ...ctx,
      pendingRequest: pendingRequests.get(cmd.dispensationId) ?? null,
    };

    const result = Dispensation.decideApprove(cmd, effectCtx);
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
      `Failed to approve dispensation after ${String(maxRetries)} retries`,
      { dispensationId: cmd.dispensationId, associationId: cmd.associationId },
    ),
  );
};

/**
 * Read-side query: load the raw association `dispensations` stream. Returns the
 * same `Result` envelope as the command path (see {@link QueryResult}) so
 * callers unwrap reads and writes symmetrically — a store/IO failure surfaces
 * as `err(DomainError)` instead of a thrown exception bubbling out of the read.
 */
export const loadAssociationDispensations = async (
  store: CannaEventStore,
  associationId: string,
): Promise<
  QueryResult<{
    readonly events: readonly DomainEvent<string, unknown>[];
    readonly currentStreamVersion: bigint;
  }>
> => {
  try {
    const { events, currentStreamVersion } = await store.readStream(
      associationStream(associationId),
    );
    return ok({ events, currentStreamVersion });
  } catch (e) {
    return err(
      domainError(
        "DISPENSATION_STREAM_READ_FAILED",
        `Failed to read association dispensation stream`,
        {
          associationId,
          cause: e instanceof Error ? e.message : String(e),
        },
      ),
    );
  }
};

/**
 * Read-side query: grams consumed by a member in a given month, folded from the
 * association `MemberQuotaConsumed` stream. This is the same accumulator the
 * `member_quota` read-model projects, exposed for tools/UI that need the live
 * consumed/remaining figures without re-running a full dispensation context.
 *
 * Returns `0g` when the member has no consumption recorded for the month.
 */
export const loadMemberQuotaConsumed = async (
  store: CannaEventStore,
  associationId: string,
  memberId: string,
  month: string,
): Promise<QuantityGrams> => {
  const { events } = await store.readStream(associationStream(associationId));
  const projection = projectAssociationStream(events);
  return projection.quotaConsumedByMemberMonth.get(`${memberId}|${month}`) ?? ZERO;
};
