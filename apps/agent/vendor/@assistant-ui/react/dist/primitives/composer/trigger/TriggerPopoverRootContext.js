"use client";
import { ComposerInputPluginProvider, useComposerInputPluginRegistryOptional } from "../ComposerInputPluginContext.js";
import { createContext, useCallback, useContext, useMemo, useRef, useSyncExternalStore } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/composer/trigger/TriggerPopoverRootContext.tsx
const TriggerPopoverRootContext = createContext(null);
const TriggerPopoverAriaPublishContext = createContext(null);
const useTriggerPopoverRootContext = () => {
	const ctx = useContext(TriggerPopoverRootContext);
	if (!ctx) throw new Error("useTriggerPopoverRootContext must be used within ComposerPrimitive.TriggerPopoverRoot");
	return ctx;
};
const useTriggerPopoverRootContextOptional = () => useContext(TriggerPopoverRootContext);
/**
* Internal hook used by `TriggerPopover` children to publish their open and
* highlight state. Not exported from the trigger module.
*/
const useTriggerPopoverAriaPublish = () => {
	const ctx = useContext(TriggerPopoverAriaPublishContext);
	if (!ctx) throw new Error("useTriggerPopoverAriaPublish must be used within ComposerPrimitive.TriggerPopoverRoot");
	return ctx;
};
/**
* Live map of registered triggers, re-rendering on change. Prefer
* `subscribeLifecycle` for incremental add/remove handling.
*/
const useTriggerPopoverTriggers = () => {
	const ctx = useTriggerPopoverRootContext();
	return useSyncExternalStore(ctx.subscribe, ctx.getTriggers, ctx.getTriggers);
};
const EMPTY_TRIGGERS = /* @__PURE__ */ new Map();
const noopSubscribe = () => () => {};
const getEmptyTriggers = () => EMPTY_TRIGGERS;
/** Like `useTriggerPopoverTriggers` but returns an empty map outside a root. */
const useTriggerPopoverTriggersOptional = () => {
	const ctx = useTriggerPopoverRootContextOptional();
	return useSyncExternalStore(ctx ? ctx.subscribe : noopSubscribe, ctx ? ctx.getTriggers : getEmptyTriggers, ctx ? ctx.getTriggers : getEmptyTriggers);
};
const getNullAria = () => null;
/**
* Returns the ARIA descriptor of the currently open trigger popover, or
* `null` if none is open or the consumer is rendered outside a
* `TriggerPopoverRoot`.
*/
const useTriggerPopoverActiveAriaOptional = () => {
	const ctx = useTriggerPopoverRootContextOptional();
	return useSyncExternalStore(ctx ? ctx.subscribeAria : noopSubscribe, ctx ? ctx.getActiveAria : getNullAria, ctx ? ctx.getActiveAria : getNullAria);
};
/**
* Local helper for the simple "notify-all listeners" subscribable pattern.
* Used twice in this file (trigger registry, active ARIA); kept inline to
* avoid pulling a single-use abstraction into the wider tree.
*/
function useSimpleSubscribable() {
	const listenersRef = useRef(/* @__PURE__ */ new Set());
	return {
		notify: useCallback(() => {
			for (const listener of listenersRef.current) listener();
		}, []),
		subscribe: useCallback((listener) => {
			listenersRef.current.add(listener);
			return () => {
				listenersRef.current.delete(listener);
			};
		}, [])
	};
}
const TriggerPopoverRootInner = ({ children }) => {
	const triggersRef = useRef(/* @__PURE__ */ new Map());
	const lifecycleListenersRef = useRef(/* @__PURE__ */ new Set());
	const { notify, subscribe } = useSimpleSubscribable();
	const register = useCallback((trigger) => {
		const { char } = trigger;
		if (triggersRef.current.has(char)) {
			if (process.env.NODE_ENV !== "production") console.warn(`[assistant-ui] Duplicate TriggerPopover for char "${char}". Ignoring the second registration.`);
			return () => {};
		}
		if (process.env.NODE_ENV !== "production") {
			for (const existing of triggersRef.current.values()) if (char.startsWith(existing.char) || existing.char.startsWith(char)) console.warn(`[assistant-ui] Trigger prefix collision between "${existing.char}" and "${char}". One char is a prefix of the other; only one will match reliably.`);
		}
		const next = new Map(triggersRef.current);
		next.set(char, trigger);
		triggersRef.current = next;
		notify();
		for (const l of lifecycleListenersRef.current) l.added(trigger);
		return () => {
			const after = new Map(triggersRef.current);
			after.delete(char);
			triggersRef.current = after;
			notify();
			for (const l of lifecycleListenersRef.current) l.removed(char);
		};
	}, [notify]);
	const getTriggers = useCallback(() => triggersRef.current, []);
	const subscribeLifecycle = useCallback((listener) => {
		lifecycleListenersRef.current.add(listener);
		return () => {
			lifecycleListenersRef.current.delete(listener);
		};
	}, []);
	const activeAriaRef = useRef(null);
	const activeAriaCharRef = useRef(null);
	const { notify: notifyAria, subscribe: subscribeAria } = useSimpleSubscribable();
	const setActiveAria = useCallback((char, aria) => {
		if (aria === null) {
			if (activeAriaCharRef.current !== char) return;
			activeAriaRef.current = null;
			activeAriaCharRef.current = null;
			notifyAria();
			return;
		}
		const prev = activeAriaRef.current;
		if (activeAriaCharRef.current === char && prev !== null && prev.popoverId === aria.popoverId && prev.highlightedItemId === aria.highlightedItemId) return;
		activeAriaRef.current = aria;
		activeAriaCharRef.current = char;
		notifyAria();
	}, [notifyAria]);
	const getActiveAria = useCallback(() => activeAriaRef.current, []);
	const value = useMemo(() => ({
		register,
		getTriggers,
		subscribe,
		subscribeLifecycle,
		getActiveAria,
		subscribeAria
	}), [
		register,
		getTriggers,
		subscribe,
		subscribeLifecycle,
		getActiveAria,
		subscribeAria
	]);
	const ariaPublishValue = useMemo(() => ({ setActiveAria }), [setActiveAria]);
	return /* @__PURE__ */ jsx(TriggerPopoverRootContext.Provider, {
		value,
		children: /* @__PURE__ */ jsx(TriggerPopoverAriaPublishContext.Provider, {
			value: ariaPublishValue,
			children
		})
	});
};
/**
* Provider that groups one or more `TriggerPopover` declarations. Each trigger
* is identified by its `char` (unique within the root). Behavior is contributed
* by a child `TriggerPopover.Directive` or `TriggerPopover.Action`.
*
* @example
* ```tsx
* <ComposerPrimitive.Unstable_TriggerPopoverRoot>
*   <ComposerPrimitive.Unstable_TriggerPopover char="@" adapter={mentionAdapter}>
*     <ComposerPrimitive.Unstable_TriggerPopover.Directive formatter={formatter} />
*     ...
*   </ComposerPrimitive.Unstable_TriggerPopover>
*
*   <ComposerPrimitive.Unstable_TriggerPopover char="/" adapter={slashAdapter}>
*     <ComposerPrimitive.Unstable_TriggerPopover.Action onExecute={handler} />
*     ...
*   </ComposerPrimitive.Unstable_TriggerPopover>
*
*   <ComposerPrimitive.Root>
*     <ComposerPrimitive.Input />
*   </ComposerPrimitive.Root>
* </ComposerPrimitive.Unstable_TriggerPopoverRoot>
* ```
*/
const ComposerPrimitiveTriggerPopoverRoot = ({ children }) => {
	if (useComposerInputPluginRegistryOptional()) return /* @__PURE__ */ jsx(TriggerPopoverRootInner, { children });
	return /* @__PURE__ */ jsx(ComposerInputPluginProvider, { children: /* @__PURE__ */ jsx(TriggerPopoverRootInner, { children }) });
};
ComposerPrimitiveTriggerPopoverRoot.displayName = "ComposerPrimitive.TriggerPopoverRoot";
//#endregion
export { ComposerPrimitiveTriggerPopoverRoot, useTriggerPopoverActiveAriaOptional, useTriggerPopoverAriaPublish, useTriggerPopoverRootContext, useTriggerPopoverRootContextOptional, useTriggerPopoverTriggers, useTriggerPopoverTriggersOptional };

//# sourceMappingURL=TriggerPopoverRootContext.js.map