import { getInMemoryEventStore } from "@event-driven-io/emmett";
import type { CannaEventStore } from "./types.js";
import { wrapEmmettStore } from "./wrap.js";

export const createInMemoryEventStore = (): CannaEventStore =>
  wrapEmmettStore(getInMemoryEventStore());
