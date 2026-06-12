"use client";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom.js";
import { useMediaQuery } from "../../utils/hooks/useMediaQuery.js";
import { useComposerInputPluginRegistryOptional } from "./ComposerInputPluginContext.js";
import { useTriggerPopoverActiveAriaOptional } from "./trigger/TriggerPopoverRootContext.js";
import { useAui, useAuiState } from "@assistant-ui/store";
import { cloneElement, forwardRef, isValidElement, useCallback, useEffect, useRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useEscapeKeydown } from "@radix-ui/react-use-escape-keydown";
import { Slot } from "radix-ui";
import TextareaAutosize from "react-textarea-autosize";
import { flushTapSync } from "@assistant-ui/tap";
//#region src/primitives/composer/ComposerInput.tsx
const TOUCH_PRIMARY_QUERY = "(pointer: coarse) and (not (any-pointer: fine))";
/**
* A text input component for composing messages.
*
* This component provides a rich text input experience with automatic resizing,
* keyboard shortcuts, file paste support, and intelligent focus management.
* It integrates with the composer context to manage message state and submission.
*
* When rendered inside `Unstable_TriggerPopoverRoot` and a popover is open, the
* underlying `<textarea>` automatically receives `aria-controls`,
* `aria-expanded`, `aria-haspopup`, and `aria-activedescendant` for the
* combobox relationship. These computed attributes override user-provided
* values for those four ARIA props while the popover is open.
*
* @example
* ```tsx
* // Ctrl/Cmd+Enter to submit (plain Enter inserts newline)
* <ComposerPrimitive.Input
*   placeholder="Type your message..."
*   submitMode="ctrlEnter"
* />
*
* // Insert a newline on Enter on touch-primary devices.
* <ComposerPrimitive.Input
*   placeholder="Type your message..."
*   unstable_insertNewlineOnTouchEnter
* />
*
* // Old API (deprecated, still supported)
* <ComposerPrimitive.Input
*   placeholder="Type your message..."
*   submitOnEnter={true}
* />
* ```
*/
const ComposerPrimitiveInput = forwardRef(({ autoFocus = false, asChild, render, disabled: disabledProp, onChange, onKeyDown, onPaste, onSelect, submitOnEnter, submitMode, cancelOnEscape = true, unstable_focusOnRunStart = true, unstable_focusOnScrollToBottom = true, unstable_focusOnThreadSwitched = true, unstable_insertNewlineOnTouchEnter = false, addAttachmentOnPaste = true, ...rest }, forwardedRef) => {
	const aui = useAui();
	const pluginRegistry = useComposerInputPluginRegistryOptional();
	const activeAria = useTriggerPopoverActiveAriaOptional();
	const declaredSubmitMode = submitMode ?? (submitOnEnter === false ? "none" : "enter");
	const isTouchPrimary = useMediaQuery(unstable_insertNewlineOnTouchEnter ? TOUCH_PRIMARY_QUERY : null);
	const effectiveSubmitMode = unstable_insertNewlineOnTouchEnter && isTouchPrimary && declaredSubmitMode === "enter" ? "none" : declaredSubmitMode;
	const value = useAuiState((s) => {
		if (!s.composer.isEditing) return "";
		return s.composer.text;
	});
	const isDisabled = useAuiState((s) => s.thread.isDisabled || s.composer.dictation?.inputDisabled) || disabledProp;
	const textareaRef = useRef(null);
	const ref = useComposedRefs(forwardedRef, textareaRef);
	const compositionRef = useRef(false);
	useEscapeKeydown((e) => {
		if (!textareaRef.current?.contains(e.target)) return;
		if (pluginRegistry) {
			for (const plugin of pluginRegistry.getPlugins()) if (plugin.handleKeyDown(e)) return;
		}
		if (!cancelOnEscape) return;
		const composer = aui.composer();
		if (composer.getState().canCancel) {
			composer.cancel();
			e.preventDefault();
		}
	});
	const handleKeyPress = (e) => {
		if (isDisabled) return;
		if (e.nativeEvent.isComposing) return;
		if (pluginRegistry) {
			for (const plugin of pluginRegistry.getPlugins()) if (plugin.handleKeyDown(e)) return;
		}
		if (e.key === "Enter") {
			const threadState = aui.thread().getState();
			const hasQueue = threadState.capabilities.queue;
			if (e.shiftKey && (e.ctrlKey || e.metaKey) && hasQueue && declaredSubmitMode !== "none" && aui.composer().getState().canSend) {
				e.preventDefault();
				aui.composer().send({ steer: true });
				return;
			}
			if (e.shiftKey) return;
			if (threadState.isRunning && !hasQueue) return;
			let shouldSubmit = false;
			if (effectiveSubmitMode === "ctrlEnter") shouldSubmit = e.ctrlKey || e.metaKey;
			else if (effectiveSubmitMode === "enter") shouldSubmit = true;
			if (shouldSubmit) {
				e.preventDefault();
				textareaRef.current?.closest("form")?.requestSubmit();
			}
		}
	};
	const handlePaste = async (e) => {
		if (!addAttachmentOnPaste) return;
		const threadCapabilities = aui.thread().getState().capabilities;
		const files = Array.from(e.clipboardData?.files || []);
		if (threadCapabilities.attachments && files.length > 0) try {
			e.preventDefault();
			await Promise.all(files.map((file) => aui.composer().addAttachment(file)));
		} catch (error) {
			console.error("Error adding attachment:", error);
		}
	};
	const autoFocusEnabled = autoFocus && !isDisabled;
	const focus = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea || !autoFocusEnabled) return;
		textarea.focus({ preventScroll: true });
		textarea.setSelectionRange(textarea.value.length, textarea.value.length);
	}, [autoFocusEnabled]);
	useEffect(() => focus(), [focus]);
	useOnScrollToBottom(() => {
		if (aui.composer().getState().type === "thread" && unstable_focusOnScrollToBottom) focus();
	});
	useEffect(() => {
		if (aui.composer().getState().type !== "thread" || !unstable_focusOnRunStart) return void 0;
		return aui.on("thread.runStart", focus);
	}, [
		unstable_focusOnRunStart,
		focus,
		aui
	]);
	useEffect(() => {
		if (aui.composer().getState().type !== "thread" || !unstable_focusOnThreadSwitched) return void 0;
		return aui.on("threadListItem.switchedTo", focus);
	}, [
		unstable_focusOnThreadSwitched,
		focus,
		aui
	]);
	const ariaComboboxProps = activeAria ? {
		"aria-controls": activeAria.popoverId,
		"aria-expanded": true,
		"aria-haspopup": "listbox",
		"aria-activedescendant": activeAria.highlightedItemId
	} : {};
	const inputProps = {
		name: "input",
		value,
		...rest,
		...ariaComboboxProps,
		ref,
		disabled: isDisabled,
		onChange: composeEventHandlers(onChange, (e) => {
			if (!aui.composer().getState().isEditing) return;
			const nativeIsComposing = e.nativeEvent.isComposing === true;
			if (compositionRef.current && !nativeIsComposing) compositionRef.current = false;
			const isComposing = nativeIsComposing || compositionRef.current;
			flushTapSync(() => {
				aui.composer().setText(e.target.value);
			});
			if (isComposing) return;
			const pos = e.target.selectionStart ?? e.target.value.length;
			if (pluginRegistry) for (const plugin of pluginRegistry.getPlugins()) plugin.setCursorPosition(pos);
		}),
		onKeyDown: composeEventHandlers(onKeyDown, handleKeyPress),
		onCompositionStart: composeEventHandlers(rest.onCompositionStart, () => {
			compositionRef.current = true;
		}),
		onCompositionEnd: composeEventHandlers(rest.onCompositionEnd, (e) => {
			compositionRef.current = false;
			if (!aui.composer().getState().isEditing) return;
			const target = e.target;
			flushTapSync(() => {
				aui.composer().setText(target.value);
			});
			const pos = target.selectionStart ?? target.value.length;
			if (pluginRegistry) for (const plugin of pluginRegistry.getPlugins()) plugin.setCursorPosition(pos);
		}),
		onSelect: composeEventHandlers(onSelect, (e) => {
			if (compositionRef.current) return;
			const target = e.target;
			const pos = target.selectionStart ?? target.value.length;
			if (pluginRegistry) for (const plugin of pluginRegistry.getPlugins()) plugin.setCursorPosition(pos);
		}),
		onPaste: composeEventHandlers(onPaste, handlePaste)
	};
	if (render && isValidElement(render)) {
		const renderChildren = rest.children !== void 0 ? rest.children : render.props.children;
		return /* @__PURE__ */ jsx(Slot.Root, {
			...inputProps,
			children: cloneElement(render, void 0, renderChildren)
		});
	}
	return /* @__PURE__ */ jsx(asChild ? Slot.Root : TextareaAutosize, { ...inputProps });
});
ComposerPrimitiveInput.displayName = "ComposerPrimitive.Input";
//#endregion
export { ComposerPrimitiveInput };

//# sourceMappingURL=ComposerInput.js.map