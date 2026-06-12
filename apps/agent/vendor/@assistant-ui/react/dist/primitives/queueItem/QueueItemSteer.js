"use client";
import { createActionButton } from "../../utils/createActionButton.js";
import { useAui } from "@assistant-ui/store";
import { useCallback } from "@assistant-ui/tap/react-shim";
//#region src/primitives/queueItem/QueueItemSteer.ts
const useQueueItemSteer = () => {
	const aui = useAui();
	return useCallback(() => {
		aui.queueItem().steer();
	}, [aui]);
};
/**
* A button that steers the current run to process this queue item immediately.
*
* @example
* ```tsx
* <QueueItemPrimitive.Steer>Run Now</QueueItemPrimitive.Steer>
* ```
*/
const QueueItemPrimitiveSteer = createActionButton("QueueItemPrimitive.Steer", useQueueItemSteer);
//#endregion
export { QueueItemPrimitiveSteer };

//# sourceMappingURL=QueueItemSteer.js.map