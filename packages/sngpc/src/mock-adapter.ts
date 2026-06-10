import type {
  MockAdapterOptions,
  SngpcSubmissionResult,
} from "./types.js";

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const PROTOCOL_PREFIX = "MOCK-SNGPC";

/**
 * Mock ANVISA endpoint. Used by worker tests + local dev to keep the
 * `sngpc-submission` BullMQ queue exercised without real network.
 *
 * Determinism rules:
 *   - `failProbability >= 1` → always returns an error
 *   - `failProbability <= 0` (default) → always returns success
 *   - other values → `Math.random()` gate (caller seeds via vitest mocks
 *     when reproducibility is needed)
 */
export const submitMockSngpc = async (
  xml: string,
  opts?: MockAdapterOptions,
): Promise<SngpcSubmissionResult> => {
  // xml is intentionally accepted but not parsed in v0.2 spike; real adapter
  // (v0.5) will POST it to the ANVISA REST endpoint.
  void xml;
  const failProb = opts?.failProbability ?? 0;
  const latency = opts?.latencyMs ?? 0;

  if (latency > 0) {
    await wait(latency);
  }

  if (failProb >= 1) {
    return { error: "mock SNGPC adapter forced failure (failProbability=1)" };
  }
  if (failProb > 0 && Math.random() < failProb) {
    return { error: "mock SNGPC adapter random failure" };
  }

  const protocolNumber = `${PROTOCOL_PREFIX}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  return {
    protocolNumber,
    sentAt: new Date(),
  };
};

export type MockSngpcAdapter = typeof submitMockSngpc;
