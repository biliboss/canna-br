"use client";
import { createActionButton } from "../../utils/createActionButton.js";
import { useAui } from "@assistant-ui/store";
import { useCallback } from "@assistant-ui/tap/react-shim";
//#region src/primitives/queueItem/QueueItemRemove.ts
const useQueueItemRemove = () => {
	const aui = useAui();
	return useCallback(() => {
		aui.queueItem().remove();
	}, [aui]);
};
/**
* A button that removes this item from the queue.
*
* @example
* ```tsx
* <QueueItemPrimitive.Remove>×</QueueItemPrimitive.Remove>
* ```
*/
const QueueItemPrimitiveRemove = createActionButton("QueueItemPrimitive.Remove", useQueueItemRemove);
//#endregion
export { QueueItemPrimitiveRemove };

//# sourceMappingURL=QueueItemRemove.js.map