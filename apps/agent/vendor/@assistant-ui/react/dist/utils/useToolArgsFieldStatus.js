import { useAuiState } from "@assistant-ui/store";
import { getPartialJsonObjectFieldState } from "assistant-stream/utils";
//#region src/utils/useToolArgsFieldStatus.ts
const COMPLETE_STATUS = { type: "complete" };
const useToolArgsFieldStatus = (fieldPath) => {
	return useAuiState((s) => {
		if (s.part.type !== "tool-call") throw new Error("useToolArgsFieldStatus can only be used inside tool-call message parts");
		if (getPartialJsonObjectFieldState(s.part.args, fieldPath) === "complete" || s.part.status?.type === "requires-action") return COMPLETE_STATUS;
		return s.part.status;
	});
};
//#endregion
export { useToolArgsFieldStatus };

//# sourceMappingURL=useToolArgsFieldStatus.js.map