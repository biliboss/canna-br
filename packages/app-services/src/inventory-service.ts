import { err, ok, isDomainError } from "@canna/shared";
import type { CannaEventStore } from "@canna/event-store";
import { Inventory } from "@canna/domain";
import type { CommandResult } from "./result.js";

const streamId = (lotId: string) => `lot:${lotId}`;

const aggregate = async (store: CannaEventStore, lotId: string) => {
  const r = await store.aggregateStream<Inventory.LotState, Inventory.InventoryEvent>(
    streamId(lotId),
    {
      evolve: Inventory.evolve,
      initialState: () => Inventory.emptyLotState,
    },
  );
  return { state: r.state, version: r.currentStreamVersion };
};

const handle = async (
  store: CannaEventStore,
  lotId: string,
  cmd: Inventory.InventoryCommand,
): Promise<CommandResult<Inventory.InventoryEvent>> => {
  const { state, version } = await aggregate(store, lotId);
  const result = Inventory.decide(cmd, state);
  if (isDomainError(result)) {
    return err(result);
  }
  const stream = streamId(lotId);
  const expectedVersion = state.status === "EMPTY" ? "none" : version;
  const appended = await store.appendToStream<Inventory.InventoryEvent>(
    stream,
    result,
    expectedVersion,
  );
  return ok({ events: result, nextVersion: appended.nextExpectedVersion });
};

export const createLot = (store: CannaEventStore, cmd: Inventory.CreateLot) =>
  handle(store, cmd.lotId, cmd);

export const quarantineLot = (
  store: CannaEventStore,
  cmd: Inventory.QuarantineLot,
) => handle(store, cmd.lotId, cmd);

export const releaseLot = (
  store: CannaEventStore,
  cmd: Inventory.ReleaseLot,
) => handle(store, cmd.lotId, cmd);

export const recallLot = (store: CannaEventStore, cmd: Inventory.RecallLot) =>
  handle(store, cmd.lotId, cmd);

export const loadLotState = (store: CannaEventStore, lotId: string) =>
  aggregate(store, lotId);
