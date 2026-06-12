"use client";
import { Primitive } from "../../utils/Primitive.js";
import { getSelectionMessageId } from "../../utils/getSelectionMessageId.js";
import { createContext, forwardRef, useContext, useEffect, useState } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { createPortal } from "react-dom";
//#region src/primitives/selectionToolbar/SelectionToolbarRoot.tsx
const SelectionToolbarContext = createContext(null);
const useSelectionToolbarInfo = () => useContext(SelectionToolbarContext);
/**
* A floating toolbar that appears when text is selected within a message.
*
* Listens for mouse and keyboard selection events, validates that the
* selection is within a single message, and renders a positioned portal
* near the selection. Prevents mousedown from clearing the selection.
*
* @example
* ```tsx
* <SelectionToolbarPrimitive.Root>
*   <SelectionToolbarPrimitive.Quote>Quote</SelectionToolbarPrimitive.Quote>
* </SelectionToolbarPrimitive.Root>
* ```
*/
const SelectionToolbarPrimitiveRoot = forwardRef(({ onMouseDown, style, ...props }, forwardedRef) => {
	const [info, setInfo] = useState(null);
	useEffect(() => {
		const checkSelection = () => {
			requestAnimationFrame(() => {
				const sel = window.getSelection();
				if (!sel || sel.isCollapsed) {
					setInfo(null);
					return;
				}
				const text = sel.toString().trim();
				if (!text) {
					setInfo(null);
					return;
				}
				const messageId = getSelectionMessageId(sel);
				if (!messageId) {
					setInfo(null);
					return;
				}
				setInfo({
					text,
					messageId,
					rect: sel.getRangeAt(0).getBoundingClientRect()
				});
			});
		};
		const handleSelectionCollapse = () => {
			const sel = window.getSelection();
			if (!sel || sel.isCollapsed) setInfo(null);
		};
		const handleScroll = () => {
			setInfo(null);
		};
		document.addEventListener("mouseup", checkSelection);
		document.addEventListener("keyup", checkSelection);
		document.addEventListener("selectionchange", handleSelectionCollapse);
		document.addEventListener("scroll", handleScroll, true);
		return () => {
			document.removeEventListener("mouseup", checkSelection);
			document.removeEventListener("keyup", checkSelection);
			document.removeEventListener("selectionchange", handleSelectionCollapse);
			document.removeEventListener("scroll", handleScroll, true);
		};
	}, []);
	if (!info) return null;
	const positionStyle = {
		position: "fixed",
		top: `${info.rect.top - 8}px`,
		left: `${info.rect.left + info.rect.width / 2}px`,
		transform: "translate(-50%, -100%)",
		zIndex: 50,
		...style
	};
	return createPortal(/* @__PURE__ */ jsx(SelectionToolbarContext.Provider, {
		value: info,
		children: /* @__PURE__ */ jsx(Primitive.div, {
			...props,
			ref: forwardedRef,
			style: positionStyle,
			onMouseDown: (e) => {
				e.preventDefault();
				onMouseDown?.(e);
			}
		})
	}), document.body);
});
SelectionToolbarPrimitiveRoot.displayName = "SelectionToolbarPrimitive.Root";
//#endregion
export { SelectionToolbarPrimitiveRoot, useSelectionToolbarInfo };

//# sourceMappingURL=SelectionToolbarRoot.js.map