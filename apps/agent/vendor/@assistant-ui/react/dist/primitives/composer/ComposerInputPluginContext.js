"use client";
import { createContext, useCallback, useContext, useMemo, useRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/composer/ComposerInputPluginContext.tsx
const ComposerInputPluginRegistryContext = createContext(null);
const useComposerInputPluginRegistry = () => {
	const ctx = useContext(ComposerInputPluginRegistryContext);
	if (!ctx) throw new Error("useComposerInputPluginRegistry must be used within a ComposerInputPluginProvider");
	return ctx;
};
const useComposerInputPluginRegistryOptional = () => {
	return useContext(ComposerInputPluginRegistryContext);
};
const ComposerInputPluginProvider = ({ children }) => {
	const pluginsRef = useRef(/* @__PURE__ */ new Map());
	const snapshotRef = useRef([]);
	const refreshSnapshot = useCallback(() => {
		const entries = Array.from(pluginsRef.current.entries());
		entries.sort((a, b) => b[1] - a[1]);
		snapshotRef.current = entries.map(([plugin]) => plugin);
	}, []);
	const register = useCallback((plugin, opts) => {
		const priority = opts?.priority ?? 0;
		pluginsRef.current.set(plugin, priority);
		refreshSnapshot();
		return () => {
			pluginsRef.current.delete(plugin);
			refreshSnapshot();
		};
	}, [refreshSnapshot]);
	const getPlugins = useCallback(() => snapshotRef.current, []);
	const registry = useMemo(() => ({
		register,
		getPlugins
	}), [register, getPlugins]);
	return /* @__PURE__ */ jsx(ComposerInputPluginRegistryContext.Provider, {
		value: registry,
		children
	});
};
//#endregion
export { ComposerInputPluginProvider, useComposerInputPluginRegistry, useComposerInputPluginRegistryOptional };

//# sourceMappingURL=ComposerInputPluginContext.js.map