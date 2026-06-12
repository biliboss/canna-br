"use client";
import { useAuiState } from "@assistant-ui/store";
//#region src/primitives/thread/ThreadEmpty.ts
/**
* @deprecated Use `<AuiIf condition={(s) => s.thread.isEmpty} />` instead.
*/
const ThreadPrimitiveEmpty = ({ children }) => {
	return useAuiState((s) => s.thread.isEmpty) ? children : null;
};
ThreadPrimitiveEmpty.displayName = "ThreadPrimitive.Empty";
//#endregion
export { ThreadPrimitiveEmpty };

//# sourceMappingURL=ThreadEmpty.js.map