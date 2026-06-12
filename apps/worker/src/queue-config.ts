/**
 * Shared BullMQ queue configuration.
 *
 * `DEFAULT_JOB_OPTIONS` is applied as `defaultJobOptions` on every Queue so
 * jobs added through it inherit the retry policy. Regulatory durability
 * (SNGPC submission especially) requires that a single transient failure does
 * not permanently dead-letter a job — 3 attempts with exponential backoff
 * (5s base) gives transient infra/network blips room to recover before the
 * job lands in the DLQ via BullMQ's `failed` event.
 */
import type { DefaultJobOptions } from "bullmq";

export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
};
