"use client";
import { useAui } from "@assistant-ui/store";
import { cloneElement, forwardRef, isValidElement, useCallback, useState } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Slot } from "radix-ui";
//#region src/primitives/composer/ComposerAttachmentDropzone.tsx
const ComposerPrimitiveAttachmentDropzone = forwardRef(({ disabled, asChild = false, render, children, ...rest }, ref) => {
	const [isDragging, setIsDragging] = useState(false);
	const aui = useAui();
	const handleDragEnterCapture = useCallback((e) => {
		if (disabled) return;
		e.preventDefault();
		setIsDragging(true);
	}, [disabled]);
	const handleDragOverCapture = useCallback((e) => {
		if (disabled) return;
		e.preventDefault();
		if (!isDragging) setIsDragging(true);
	}, [disabled, isDragging]);
	const handleDragLeaveCapture = useCallback((e) => {
		if (disabled) return;
		e.preventDefault();
		const next = e.relatedTarget;
		if (next && e.currentTarget.contains(next)) return;
		setIsDragging(false);
	}, [disabled]);
	const handleDrop = useCallback(async (e) => {
		if (disabled) return;
		e.preventDefault();
		setIsDragging(false);
		const files = Array.from(e.dataTransfer.files);
		await Promise.all(files.map(async (file) => {
			try {
				await aui.composer().addAttachment(file);
			} catch (error) {
				console.error("Failed to add attachment:", error);
			}
		}));
	}, [disabled, aui]);
	const mergedProps = {
		...isDragging ? { "data-dragging": "true" } : null,
		...rest,
		onDragEnterCapture: composeEventHandlers(rest.onDragEnterCapture, handleDragEnterCapture),
		onDragOverCapture: composeEventHandlers(rest.onDragOverCapture, handleDragOverCapture),
		onDragLeaveCapture: composeEventHandlers(rest.onDragLeaveCapture, handleDragLeaveCapture),
		onDropCapture: composeEventHandlers(rest.onDropCapture, handleDrop),
		ref
	};
	if (render && isValidElement(render)) {
		const renderChildren = children !== void 0 ? children : render.props.children;
		return /* @__PURE__ */ jsx(Slot.Root, {
			...mergedProps,
			children: cloneElement(render, void 0, renderChildren)
		});
	}
	return /* @__PURE__ */ jsx(asChild ? Slot.Root : "div", {
		...mergedProps,
		children
	});
});
ComposerPrimitiveAttachmentDropzone.displayName = "ComposerPrimitive.AttachmentDropzone";
//#endregion
export { ComposerPrimitiveAttachmentDropzone };

//# sourceMappingURL=ComposerAttachmentDropzone.js.map