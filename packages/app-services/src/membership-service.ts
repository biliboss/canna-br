import {
  err,
  ok,
  isDomainError,
} from "@canna/shared";
import type { CannaEventStore } from "@canna/event-store";
import { Membership } from "@canna/domain";
import { expectedVersionFor, type CommandResult } from "./result.js";

const streamId = (memberId: string) => `member:${memberId}`;

/** Fold the member event stream back into current aggregate state. */
const reconstitute = async (
  store: CannaEventStore,
  memberId: string,
): Promise<{
  readonly state: Membership.MemberState;
  readonly version: bigint;
}> => {
  const r = await store.aggregateStream<
    Membership.MemberState,
    Membership.MemberEvent
  >(streamId(memberId), {
    evolve: Membership.evolve,
    initialState: () => Membership.emptyMemberState,
  });
  return { state: r.state, version: r.currentStreamVersion };
};

const handle = async (
  store: CannaEventStore,
  memberId: string,
  cmd: Membership.MemberCommand,
): Promise<CommandResult<Membership.MemberEvent>> => {
  const { state, version } = await reconstitute(store, memberId);
  const result = Membership.decide(cmd, state);
  if (isDomainError(result)) {
    return err(result);
  }
  const stream = streamId(memberId);
  const expectedVersion = expectedVersionFor(state.status, version);
  const appended = await store.appendToStream<Membership.MemberEvent>(
    stream,
    result,
    expectedVersion,
  );
  return ok({ events: result, nextVersion: appended.nextExpectedVersion });
};

export const registerMember = (
  store: CannaEventStore,
  cmd: Membership.RegisterMember,
) => handle(store, cmd.memberId, cmd);

export const grantConsent = (
  store: CannaEventStore,
  cmd: Membership.GrantConsent,
) => handle(store, cmd.memberId, cmd);

export const revokeConsent = (
  store: CannaEventStore,
  cmd: Membership.RevokeConsent,
) => handle(store, cmd.memberId, cmd);

export const validatePrescription = (
  store: CannaEventStore,
  cmd: Membership.ValidatePrescription,
) => handle(store, cmd.memberId, cmd);

export const suspendMember = (
  store: CannaEventStore,
  cmd: Membership.SuspendMember,
) => handle(store, cmd.memberId, cmd);

export const reinstateMember = (
  store: CannaEventStore,
  cmd: Membership.ReinstateMember,
) => handle(store, cmd.memberId, cmd);

export const anonymizeMember = (
  store: CannaEventStore,
  cmd: Membership.AnonymizeMember,
) => handle(store, cmd.memberId, cmd);

export const loadMemberState = (store: CannaEventStore, memberId: string) =>
  reconstitute(store, memberId);
