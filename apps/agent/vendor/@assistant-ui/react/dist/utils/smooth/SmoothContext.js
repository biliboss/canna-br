"use client";
import { createContextStoreHook } from "../../context/react/utils/createContextStoreHook.js";
import { useAui } from "@assistant-ui/store";
import { createContext, forwardRef, useContext, useState } from "@assistant-ui/tap/react-shim";
import { create } from "zustand";
import { jsx } from "react/jsx-runtime";
//#region src/utils/smooth/SmoothContext.tsx
const SmoothContext = createContext(null);
const makeSmoothContext = (initialState) => {
	return { useSmoothStatus: create(() => initialState) };
};
const SmoothContextProvider = ({ children }) => {
	const outer = useSmoothContext({ optional: true });
	const aui = useAui();
	const [context] = useState(() => makeSmoothContext(aui.part().getState().status));
	if (outer) return children;
	return /* @__PURE__ */ jsx(SmoothContext.Provider, {
		value: context,
		children
	});
};
const withSmoothContextProvider = (Component) => {
	const Wrapped = forwardRef((props, ref) => {
		return /* @__PURE__ */ jsx(SmoothContextProvider, { children: /* @__PURE__ */ jsx(Component, {
			...props,
			ref
		}) });
	});
	Wrapped.displayName = Component.displayName;
	return Wrapped;
};
function useSmoothContext(options) {
	const context = useContext(SmoothContext);
	if (!options?.optional && !context) throw new Error("This component must be used within a SmoothContextProvider.");
	return context;
}
const { useSmoothStatus, useSmoothStatusStore } = createContextStoreHook(useSmoothContext, "useSmoothStatus");
//#endregion
export { SmoothContextProvider, useSmoothStatus, useSmoothStatusStore, withSmoothContextProvider };

//# sourceMappingURL=SmoothContext.js.map