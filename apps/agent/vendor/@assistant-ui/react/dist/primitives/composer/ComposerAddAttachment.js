"use client";
import { createActionButton } from "../../utils/createActionButton.js";
import { useAui } from "@assistant-ui/store";
import { useComposerAddAttachment } from "@assistant-ui/core/react";
import { useCallback } from "@assistant-ui/tap/react-shim";
//#region src/primitives/composer/ComposerAddAttachment.ts
const useComposerAddAttachment$1 = ({ multiple = true } = {}) => {
	const { disabled, addAttachment } = useComposerAddAttachment();
	const aui = useAui();
	const callback = useCallback(() => {
		const input = document.createElement("input");
		input.type = "file";
		input.multiple = multiple;
		input.hidden = true;
		const attachmentAccept = aui.composer().getState().attachmentAccept;
		if (attachmentAccept !== "*") input.accept = attachmentAccept;
		document.body.appendChild(input);
		input.onchange = (e) => {
			const fileList = e.target.files;
			if (!fileList) return;
			for (const file of fileList) addAttachment(file);
			document.body.removeChild(input);
		};
		input.oncancel = () => {
			if (!input.files || input.files.length === 0) document.body.removeChild(input);
		};
		input.click();
	}, [
		aui,
		multiple,
		addAttachment
	]);
	if (disabled) return null;
	return callback;
};
const ComposerPrimitiveAddAttachment = createActionButton("ComposerPrimitive.AddAttachment", useComposerAddAttachment$1, ["multiple"]);
//#endregion
export { ComposerPrimitiveAddAttachment };

//# sourceMappingURL=ComposerAddAttachment.js.map