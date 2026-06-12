"use client";
import { useAuiState } from "@assistant-ui/store";
//#region src/primitives/actionBar/useActionBarFloatStatus.ts
let HideAndFloatStatus = /* @__PURE__ */ function(HideAndFloatStatus) {
	HideAndFloatStatus["Hidden"] = "hidden";
	HideAndFloatStatus["Floating"] = "floating";
	HideAndFloatStatus["Normal"] = "normal";
	return HideAndFloatStatus;
}({});
const useActionBarFloatStatus = ({ hideWhenRunning, autohide, autohideFloat, forceVisible }) => {
	return useAuiState((s) => {
		if (hideWhenRunning && s.thread.isRunning) return "hidden";
		const autohideEnabled = autohide === "always" || autohide === "not-last" && !s.message.isLast;
		const isVisibleByInteraction = forceVisible || s.message.isHovering;
		if (!autohideEnabled) return "normal";
		if (!isVisibleByInteraction) return "hidden";
		if (autohideFloat === "always" || autohideFloat === "single-branch" && s.message.branchCount <= 1) return "floating";
		return "normal";
	});
};
//#endregion
export { HideAndFloatStatus, useActionBarFloatStatus };

//# sourceMappingURL=useActionBarFloatStatus.js.map