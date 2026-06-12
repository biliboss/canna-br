"use client";
import { useAuiState } from "@assistant-ui/store";
//#region src/primitives/thread/ThreadIf.ts
const useThreadIf = (props) => {
	return useAuiState((s) => {
		if (props.empty === true && !s.thread.isEmpty) return false;
		if (props.empty === false && s.thread.isEmpty) return false;
		if (props.running === true && !s.thread.isRunning) return false;
		if (props.running === false && s.thread.isRunning) return false;
		if (props.disabled === true && !s.thread.isDisabled) return false;
		if (props.disabled === false && s.thread.isDisabled) return false;
		return true;
	});
};
/**
* @deprecated Use `<AuiIf condition={(s) => s.thread...} />` instead.
*/
const ThreadPrimitiveIf = ({ children, ...query }) => {
	return useThreadIf(query) ? children : null;
};
ThreadPrimitiveIf.displayName = "ThreadPrimitive.If";
//#endregion
export { ThreadPrimitiveIf };

//# sourceMappingURL=ThreadIf.js.map