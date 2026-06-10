import { expect } from "vitest";
import type { DomainError, DomainEvent } from "@canna/shared";
import { isDomainError } from "@canna/shared";

export type ScenarioOutcome<E> = readonly E[] | DomainError;

export interface ScenarioInput<TState, TCommand, TEvent> {
  readonly given: readonly TEvent[];
  readonly when: TCommand;
  readonly then: ScenarioOutcome<TEvent>;
  readonly decide: (cmd: TCommand, state: TState) => ScenarioOutcome<TEvent>;
  readonly evolve: (state: TState, event: TEvent) => TState;
  readonly initial: TState;
}

const stripVolatile = <T>(e: T): unknown => {
  if (e === null || typeof e !== "object") return e;
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e as Record<string, unknown>)) {
    if (k === "occurredAt" || k === "streamId") continue;
    copy[k] =
      v instanceof Date ? v.toISOString() : v;
  }
  return copy;
};

const normalize = <E>(events: readonly E[]): unknown[] =>
  events.map((e) => {
    const top = stripVolatile(e) as Record<string, unknown> | unknown;
    if (
      top !== null &&
      typeof top === "object" &&
      "payload" in (top as Record<string, unknown>)
    ) {
      const obj = top as Record<string, unknown>;
      obj["payload"] = stripVolatile(obj["payload"]);
      return obj;
    }
    return top;
  });

export const scenario = <TState, TCommand, TEvent extends DomainEvent<string, unknown>>(
  input: ScenarioInput<TState, TCommand, TEvent>,
): void => {
  const state = input.given.reduce(
    (s, e) => input.evolve(s, e),
    input.initial,
  );
  const actual = input.decide(input.when, state);
  const expected = input.then;

  if (isDomainError(expected)) {
    if (!isDomainError(actual)) {
      expect.fail(
        `Expected DomainError "${expected.code}" but got events: ${JSON.stringify(actual, null, 2)}`,
      );
    }
    expect(actual.code).toBe(expected.code);
    return;
  }

  if (isDomainError(actual)) {
    expect.fail(
      `Expected events but got DomainError "${actual.code}": ${actual.message}`,
    );
  }

  expect(normalize(actual)).toEqual(normalize(expected));
};
