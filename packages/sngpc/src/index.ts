export { buildDispensationSngpcXml, escapeXml } from "./xml-builder.js";
export { validateSngpcXml } from "./xml-validator.js";
export { submitMockSngpc } from "./mock-adapter.js";
export type { MockSngpcAdapter } from "./mock-adapter.js";
export type {
  ValidatedXml,
  SngpcSubmissionContext,
  SngpcSubmissionResult,
  SngpcSubmissionOk,
  SngpcSubmissionError,
  MockAdapterOptions,
} from "./types.js";
export { isSngpcSubmissionOk } from "./types.js";
