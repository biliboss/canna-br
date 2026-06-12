"use client";
import { useCallback, useSyncExternalStore } from "@assistant-ui/tap/react-shim";
//#region src/utils/hooks/useMediaQuery.ts
const getServerSnapshot = () => false;
const noopUnsubscribe = () => {};
const useMediaQuery = (query) => {
	return useSyncExternalStore(useCallback((callback) => {
		if (typeof window === "undefined" || query === null) return noopUnsubscribe;
		const mql = window.matchMedia(query);
		mql.addEventListener("change", callback);
		return () => mql.removeEventListener("change", callback);
	}, [query]), useCallback(() => {
		if (typeof window === "undefined" || query === null) return false;
		return window.matchMedia(query).matches;
	}, [query]), getServerSnapshot);
};
//#endregion
export { useMediaQuery };

//# sourceMappingURL=useMediaQuery.js.map