import { useCallback, useRef } from "@assistant-ui/tap/react-shim";
//#region src/utils/hooks/useManagedRef.ts
const useManagedRef = (callback) => {
	const cleanupRef = useRef(void 0);
	return useCallback((el) => {
		if (cleanupRef.current) {
			cleanupRef.current();
			cleanupRef.current = void 0;
		}
		if (el) cleanupRef.current = callback(el);
	}, [callback]);
};
//#endregion
export { useManagedRef };

//# sourceMappingURL=useManagedRef.js.map