"use client";
import { Primitive } from "../../../utils/Primitive.js";
import { useComposerInputPluginRegistryOptional } from "../ComposerInputPluginContext.js";
import { useTriggerPopoverAriaPublish, useTriggerPopoverRootContext } from "./TriggerPopoverRootContext.js";
import { TriggerPopoverResource } from "./TriggerPopoverResource.js";
import { useAui, useAuiState } from "@assistant-ui/store";
import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { useResource } from "@assistant-ui/tap";
//#region src/primitives/composer/trigger/TriggerPopover.tsx
const TriggerPopoverScopeContext = createContext(null);
const useTriggerPopoverScopeContext = () => {
	const ctx = useContext(TriggerPopoverScopeContext);
	if (!ctx) throw new Error("useTriggerPopoverScopeContext must be used within ComposerPrimitive.TriggerPopover");
	return ctx;
};
const useTriggerPopoverScopeContextOptional = () => useContext(TriggerPopoverScopeContext);
const TriggerBehaviorRegistrationContext = createContext(null);
/** Obtain the registration handle from the parent `<TriggerPopover>`. */
const useTriggerBehaviorRegistration = () => {
	const ctx = useContext(TriggerBehaviorRegistrationContext);
	if (!ctx) throw new Error("TriggerPopover.Directive / TriggerPopover.Action must be rendered inside ComposerPrimitive.TriggerPopover");
	return ctx;
};
/**
* Declares a trigger and renders its popover container. The popover only
* renders its DOM (and children) when the trigger character is active in the
* composer input and a behavior sub-primitive has been registered.
*
* A behavior is contributed by rendering exactly one of
* `<TriggerPopover.Directive>` or `<TriggerPopover.Action>` as a child. Without
* a behavior the trigger stays closed.
*
* Must be placed inside `ComposerPrimitive.Unstable_TriggerPopoverRoot`.
*
* @example
* ```tsx
* <ComposerPrimitive.Unstable_TriggerPopover
*   char="@"
*   adapter={mentionAdapter}
* >
*   <ComposerPrimitive.Unstable_TriggerPopover.Directive formatter={formatter} />
*   <ComposerPrimitive.Unstable_TriggerPopoverCategories>
*     {(cats) => cats.map(...)}
*   </ComposerPrimitive.Unstable_TriggerPopoverCategories>
*   <ComposerPrimitive.Unstable_TriggerPopoverItems>
*     {(items) => items.map(...)}
*   </ComposerPrimitive.Unstable_TriggerPopoverItems>
* </ComposerPrimitive.Unstable_TriggerPopover>
* ```
*/
const ComposerPrimitiveTriggerPopover = forwardRef(({ char, adapter, "aria-label": ariaLabel, children, ...props }, forwardedRef) => {
	const aui = useAui();
	const text = useAuiState((s) => s.composer.text);
	const popoverId = useId();
	const behaviorRef = useRef(null);
	const [behavior, setBehavior] = useState(null);
	const registrationCountRef = useRef(0);
	const register = useCallback((next) => {
		registrationCountRef.current += 1;
		if (process.env.NODE_ENV !== "production" && registrationCountRef.current > 1) console.warn(`[assistant-ui] TriggerPopover "${char}" received more than one behavior child. Exactly one <TriggerPopover.Directive> or <TriggerPopover.Action> is allowed per TriggerPopover; the last registration wins.`);
		behaviorRef.current = next;
		setBehavior(next);
		return () => {
			registrationCountRef.current = Math.max(0, registrationCountRef.current - 1);
			if (behaviorRef.current === next) {
				behaviorRef.current = null;
				setBehavior(null);
			}
		};
	}, [char]);
	const registration = useMemo(() => ({ register }), [register]);
	const resource = useResource(TriggerPopoverResource({
		adapter,
		text,
		triggerChar: char,
		behavior: behavior ?? void 0,
		aui,
		popoverId
	}));
	const resourceRef = useRef(resource);
	resourceRef.current = resource;
	const root = useTriggerPopoverRootContext();
	useEffect(() => {
		return root.register({
			char,
			...behavior ? { behavior } : {},
			resource: resourceRef.current
		});
	}, [
		root,
		char,
		behavior
	]);
	const pluginRegistry = useComposerInputPluginRegistryOptional();
	useEffect(() => {
		if (!pluginRegistry) return void 0;
		return pluginRegistry.register(resourceRef.current);
	}, [pluginRegistry]);
	const open = behavior !== null && resource.open;
	const aria = useTriggerPopoverAriaPublish();
	useEffect(() => {
		if (!open) return void 0;
		return () => {
			aria.setActiveAria(char, null);
		};
	}, [
		aria,
		char,
		open
	]);
	useEffect(() => {
		if (!open) return;
		aria.setActiveAria(char, {
			popoverId,
			highlightedItemId: resource.highlightedItemId
		});
	}, [
		aria,
		char,
		popoverId,
		open,
		resource.highlightedItemId
	]);
	return /* @__PURE__ */ jsx(TriggerBehaviorRegistrationContext.Provider, {
		value: registration,
		children: /* @__PURE__ */ jsx(TriggerPopoverScopeContext.Provider, {
			value: resource,
			children: open ? /* @__PURE__ */ jsx(Primitive.div, {
				role: "listbox",
				id: popoverId,
				"aria-label": ariaLabel ?? "Suggestions",
				"aria-activedescendant": resource.highlightedItemId,
				"data-state": "open",
				...props,
				ref: forwardedRef,
				children
			}) : children
		})
	});
});
ComposerPrimitiveTriggerPopover.displayName = "ComposerPrimitive.TriggerPopover";
//#endregion
export { ComposerPrimitiveTriggerPopover, useTriggerBehaviorRegistration, useTriggerPopoverScopeContext, useTriggerPopoverScopeContextOptional };

//# sourceMappingURL=TriggerPopover.js.map