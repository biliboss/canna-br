"use client";
import { useThreadViewportStore } from "../../../context/react/ThreadViewportContext.js";
import { mountTopAnchorReserve } from "./mountTopAnchorReserve.js";
import { useLayoutEffect } from "@assistant-ui/tap/react-shim";
//#region src/primitives/thread/topAnchor/useTopAnchorReserve.ts
/**
* Mounts the top-turn-anchor reserve element against the active
* `ThreadViewport` store. Call this from inside the scrollable viewport so
* the reserve `<div>` is appended next to the streaming assistant message.
*/
const useTopAnchorReserve = (enabled) => {
	const threadViewportStore = useThreadViewportStore();
	useLayoutEffect(() => {
		if (!enabled) return;
		return mountTopAnchorReserve(threadViewportStore);
	}, [enabled, threadViewportStore]);
};
//#endregion
export { useTopAnchorReserve };

//# sourceMappingURL=useTopAnchorReserve.js.map