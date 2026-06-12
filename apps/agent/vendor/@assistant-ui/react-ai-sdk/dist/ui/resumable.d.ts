import { RESUMABLE_STREAM_ID_HEADER } from "assistant-stream/resumable";

//#region src/ui/resumable.d.ts
type ResumableClientStorage = {
  getStreamId(): string | null;
  setStreamId(id: string): void;
  clear(): void;
};
/** `sessionStorage`-backed storage for the pending resumable stream id. */
declare function createResumableSessionStorage(options?: {
  key?: string;
}): ResumableClientStorage;
type AssistantChatResumableOptions = {
  storage: ResumableClientStorage;
  resumeApi: string | ((streamId: string) => string);
  /**
   * Defaults to scanning for the AI SDK UIMessageStream `finish` marker.
   * Cancellation never invokes this callback, only natural completion does.
   */
  isFinishEvent?: (chunk: Uint8Array, accumulator: string) => boolean;
};
//#endregion
export { AssistantChatResumableOptions, RESUMABLE_STREAM_ID_HEADER, ResumableClientStorage, createResumableSessionStorage };
//# sourceMappingURL=resumable.d.ts.map