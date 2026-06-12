import { describe, expect, it } from "vitest";
import { DEFAULT_JOB_OPTIONS } from "../queue-config.js";

// Regulatory durability invariant: a single transient failure must NOT
// permanently dead-letter a job (notably SNGPC submission). The shared
// `defaultJobOptions` applied to every BullMQ Queue must retry 3× with
// exponential backoff before giving up.
describe("DEFAULT_JOB_OPTIONS — BullMQ retry policy", () => {
  it("retries 3 times", () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
  });

  it("uses exponential backoff with a 5s base delay", () => {
    const { backoff } = DEFAULT_JOB_OPTIONS;
    expect(backoff).toBeDefined();
    expect(typeof backoff).toBe("object");
    if (typeof backoff === "object") {
      expect(backoff.type).toBe("exponential");
      expect(backoff.delay).toBe(5000);
    }
  });
});
