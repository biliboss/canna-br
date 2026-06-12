"use client";
import { RESUMABLE_STREAM_ID_HEADER } from "assistant-stream/resumable";
//#region src/ui/resumable.ts
const DEFAULT_STORAGE_KEY = "aui-resumable-stream-id";
/** `sessionStorage`-backed storage for the pending resumable stream id. */
function createResumableSessionStorage(options) {
	const key = options?.key ?? DEFAULT_STORAGE_KEY;
	return {
		getStreamId() {
			if (typeof window === "undefined") return null;
			return window.sessionStorage.getItem(key);
		},
		setStreamId(id) {
			if (typeof window === "undefined") return;
			window.sessionStorage.setItem(key, id);
		},
		clear() {
			if (typeof window === "undefined") return;
			window.sessionStorage.removeItem(key);
		}
	};
}
//#endregion
export { RESUMABLE_STREAM_ID_HEADER, createResumableSessionStorage };

//# sourceMappingURL=resumable.js.map