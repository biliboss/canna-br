import { ulid } from "ulid";

export type ULID = string & { readonly __brand: "ULID" };

export interface IdGenerator {
  generate(): ULID;
}

export const systemIdGenerator: IdGenerator = {
  generate: () => ulid() as ULID,
};

export const fixedIdGenerator = (sequence: readonly string[]): IdGenerator => {
  let i = 0;
  return {
    generate: () => {
      const id = sequence[i];
      if (id === undefined) {
        throw new Error(
          `fixedIdGenerator exhausted after ${String(sequence.length)} ids`,
        );
      }
      i += 1;
      return id as ULID;
    },
  };
};
