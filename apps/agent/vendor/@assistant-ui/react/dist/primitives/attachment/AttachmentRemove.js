"use client";
import { createActionButton } from "../../utils/createActionButton.js";
import { useAui } from "@assistant-ui/store";
import { useCallback } from "@assistant-ui/tap/react-shim";
//#region src/primitives/attachment/AttachmentRemove.ts
const useAttachmentRemove = () => {
	const aui = useAui();
	return useCallback(() => {
		aui.attachment().remove();
	}, [aui]);
};
const AttachmentPrimitiveRemove = createActionButton("AttachmentPrimitive.Remove", useAttachmentRemove);
//#endregion
export { AttachmentPrimitiveRemove };

//# sourceMappingURL=AttachmentRemove.js.map