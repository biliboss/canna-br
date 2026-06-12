import { useEffect, useRef } from "@assistant-ui/tap/react-shim";
//#region src/legacy-runtime/runtime-cores/assistant-transport/useLatestRef.ts
function useLatestRef(value) {
	const ref = useRef(value);
	useEffect(() => {
		ref.current = value;
	}, [value]);
	return ref;
}
//#endregion
export { useLatestRef };

//# sourceMappingURL=useLatestRef.js.map