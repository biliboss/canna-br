import { useManagedRef } from "./useManagedRef.js";
import { useCallback } from "@assistant-ui/tap/react-shim";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
//#region src/utils/hooks/useOnResizeContent.ts
const useOnResizeContent = (callback) => {
	const callbackRef = useCallbackRef(callback);
	return useManagedRef(useCallback((el) => {
		const resizeObserver = new ResizeObserver(() => {
			callbackRef();
		});
		const mutationObserver = new MutationObserver((mutations) => {
			if (mutations.some((m) => m.type !== "attributes" || m.attributeName !== "style")) callbackRef();
		});
		resizeObserver.observe(el);
		mutationObserver.observe(el, {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: true
		});
		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	}, [callbackRef]));
};
//#endregion
export { useOnResizeContent };

//# sourceMappingURL=useOnResizeContent.js.map