export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export const fixedClock = (initial: Date): Clock & { tick(ms: number): void } => {
  let current = new Date(initial.getTime());
  return {
    now: () => new Date(current.getTime()),
    tick(ms: number) {
      current = new Date(current.getTime() + ms);
    },
  };
};
