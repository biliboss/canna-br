"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAui, useAuiState } from "@assistant-ui/store";
import { forwardRef, useCallback } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/actionBar/ActionBarExportMarkdown.tsx
const useActionBarExportMarkdown = ({ filename, onExport } = {}) => {
	const aui = useAui();
	const hasExportableContent = useAuiState((s) => {
		return (s.message.role !== "assistant" || s.message.status?.type !== "running") && s.message.parts.some((c) => c.type === "text" && c.text.length > 0);
	});
	const callback = useCallback(async () => {
		const content = aui.message().getCopyText();
		if (!content) return;
		if (onExport) {
			await onExport(content);
			return;
		}
		const blob = new Blob([content], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename ?? `message-${Date.now()}.md`;
		a.click();
		URL.revokeObjectURL(url);
	}, [
		aui,
		filename,
		onExport
	]);
	if (!hasExportableContent) return null;
	return callback;
};
const ActionBarPrimitiveExportMarkdown = forwardRef(({ filename, onExport, onClick, disabled, ...props }, forwardedRef) => {
	const callback = useActionBarExportMarkdown({
		filename,
		onExport
	});
	return /* @__PURE__ */ jsx(Primitive.button, {
		type: "button",
		...props,
		ref: forwardedRef,
		disabled: disabled || !callback,
		onClick: composeEventHandlers(onClick, () => {
			callback?.();
		})
	});
});
ActionBarPrimitiveExportMarkdown.displayName = "ActionBarPrimitive.ExportMarkdown";
//#endregion
export { ActionBarPrimitiveExportMarkdown };

//# sourceMappingURL=ActionBarExportMarkdown.js.map