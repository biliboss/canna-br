"use client";
import { createActionButton } from "../../utils/createActionButton.js";
import { useThreadListItemTrigger } from "@assistant-ui/core/react";
//#region src/primitives/threadListItem/ThreadListItemTrigger.ts
const useThreadListItemTrigger$1 = () => {
	const { switchTo } = useThreadListItemTrigger();
	return switchTo;
};
const ThreadListItemPrimitiveTrigger = createActionButton("ThreadListItemPrimitive.Trigger", useThreadListItemTrigger$1);
//#endregion
export { ThreadListItemPrimitiveTrigger };

//# sourceMappingURL=ThreadListItemTrigger.js.map