"use client";
import { PartByIndexProvider } from "../../context/providers/PartByIndexProvider.js";
import { TextMessagePartProvider } from "../../context/providers/TextMessagePartProvider.js";
import { MessagePartPrimitiveText } from "../messagePart/MessagePartText.js";
import { MessagePartPrimitiveImage } from "../messagePart/MessagePartImage.js";
import { MessagePartPrimitiveInProgress } from "../messagePart/MessagePartInProgress.js";
import { useAui, useAuiState } from "@assistant-ui/store";
import { memo, useMemo } from "@assistant-ui/tap/react-shim";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/primitives/message/MessagePartsGrouped.tsx
/**
* Groups message parts by their parent ID.
* Parts without a parent ID appear in their chronological position as individual groups.
* Parts with the same parent ID are grouped together at the position of their first occurrence.
*/
const groupMessagePartsByParentId = (parts) => {
	const groupMap = /* @__PURE__ */ new Map();
	for (let i = 0; i < parts.length; i++) {
		const groupId = parts[i]?.parentId ?? `__ungrouped_${i}`;
		const indices = groupMap.get(groupId) ?? [];
		indices.push(i);
		groupMap.set(groupId, indices);
	}
	const groups = [];
	for (const [groupId, indices] of groupMap) {
		const groupKey = groupId.startsWith("__ungrouped_") ? void 0 : groupId;
		groups.push({
			groupKey,
			indices
		});
	}
	return groups;
};
const useMessagePartsGrouped = (groupingFunction) => {
	const parts = useAuiState((s) => s.message.parts);
	return useMemo(() => {
		if (parts.length === 0) return [];
		return groupingFunction(parts);
	}, [parts, groupingFunction]);
};
const ToolUIDisplay = ({ Fallback, ...props }) => {
	const Render = useAuiState((s) => {
		const Render = s.tools.tools[props.toolName] ?? Fallback;
		if (Array.isArray(Render)) return Render[0] ?? Fallback;
		return Render;
	});
	if (!Render) return null;
	return /* @__PURE__ */ jsx(Render, { ...props });
};
const DataUIDisplay = ({ Fallback, ...props }) => {
	const Render = useAuiState((s) => {
		const Render = s.dataRenderers.renderers[props.name] ?? Fallback;
		if (Array.isArray(Render)) return Render[0] ?? Fallback;
		return Render;
	});
	if (!Render) return null;
	return /* @__PURE__ */ jsx(Render, { ...props });
};
const defaultComponents = {
	Text: () => /* @__PURE__ */ jsxs("p", {
		style: { whiteSpace: "pre-line" },
		children: [/* @__PURE__ */ jsx(MessagePartPrimitiveText, {}), /* @__PURE__ */ jsx(MessagePartPrimitiveInProgress, { children: /* @__PURE__ */ jsx("span", {
			style: { fontFamily: "revert" },
			children: " ●"
		}) })]
	}),
	Reasoning: () => null,
	Source: () => null,
	Image: () => /* @__PURE__ */ jsx(MessagePartPrimitiveImage, {}),
	File: () => null,
	Unstable_Audio: () => null,
	Group: ({ children }) => children
};
const MessagePartComponent = ({ components: { Text = defaultComponents.Text, Reasoning = defaultComponents.Reasoning, Image = defaultComponents.Image, Source = defaultComponents.Source, File = defaultComponents.File, Unstable_Audio: Audio = defaultComponents.Unstable_Audio, tools = {}, data } = {} }) => {
	const aui = useAui();
	const part = useAuiState((s) => s.part);
	const type = part.type;
	if (type === "tool-call") {
		const addResult = aui.part().addToolResult;
		const resume = aui.part().resumeToolCall;
		const respondToApproval = aui.part().respondToToolApproval;
		if ("Override" in tools) return /* @__PURE__ */ jsx(tools.Override, {
			...part,
			addResult,
			resume,
			respondToApproval
		});
		const Tool = tools.by_name?.[part.toolName] ?? tools.Fallback;
		return /* @__PURE__ */ jsx(ToolUIDisplay, {
			...part,
			Fallback: Tool,
			addResult,
			resume,
			respondToApproval
		});
	}
	if (part.status?.type === "requires-action") throw new Error("Encountered unexpected requires-action status");
	switch (type) {
		case "text": return /* @__PURE__ */ jsx(Text, { ...part });
		case "reasoning": return /* @__PURE__ */ jsx(Reasoning, { ...part });
		case "source": return /* @__PURE__ */ jsx(Source, { ...part });
		case "image": return /* @__PURE__ */ jsx(Image, { ...part });
		case "file": return /* @__PURE__ */ jsx(File, { ...part });
		case "audio": return /* @__PURE__ */ jsx(Audio, { ...part });
		case "data": {
			const Data = data?.by_name?.[part.name] ?? data?.Fallback;
			return /* @__PURE__ */ jsx(DataUIDisplay, {
				...part,
				Fallback: Data
			});
		}
		default:
			console.warn(`Unknown message part type: ${type}`);
			return null;
	}
};
const MessagePartImpl = ({ partIndex, components }) => {
	return /* @__PURE__ */ jsx(PartByIndexProvider, {
		index: partIndex,
		children: /* @__PURE__ */ jsx(MessagePartComponent, { components })
	});
};
const MessagePart = memo(MessagePartImpl, (prev, next) => prev.partIndex === next.partIndex && prev.components?.Text === next.components?.Text && prev.components?.Reasoning === next.components?.Reasoning && prev.components?.Source === next.components?.Source && prev.components?.Image === next.components?.Image && prev.components?.File === next.components?.File && prev.components?.Unstable_Audio === next.components?.Unstable_Audio && prev.components?.tools === next.components?.tools && prev.components?.data === next.components?.data && prev.components?.Group === next.components?.Group);
const EmptyPartFallback = ({ status, component: Component }) => {
	return /* @__PURE__ */ jsx(TextMessagePartProvider, {
		text: "",
		isRunning: status.type === "running",
		children: /* @__PURE__ */ jsx(Component, {
			type: "text",
			text: "",
			status
		})
	});
};
const COMPLETE_STATUS = Object.freeze({ type: "complete" });
const EmptyPartsImpl = ({ components }) => {
	const status = useAuiState((s) => s.message.status ?? COMPLETE_STATUS);
	if (components?.Empty) return /* @__PURE__ */ jsx(components.Empty, { status });
	return /* @__PURE__ */ jsx(EmptyPartFallback, {
		status,
		component: components?.Text ?? defaultComponents.Text
	});
};
const EmptyParts = memo(EmptyPartsImpl, (prev, next) => prev.components?.Empty === next.components?.Empty && prev.components?.Text === next.components?.Text);
/**
* Renders the parts of a message grouped by a custom grouping function.
*
* This component allows you to group message parts based on any criteria you define.
* The grouping function receives all message parts and returns an array of groups,
* where each group has a key and an array of part indices.
*
* @deprecated Prefer `<MessagePrimitive.GroupedParts>` for adjacent
* grouping — it dispatches all rendering through one `switch (part.type)`
* and supports nested group paths. Keep this primitive only for
* non-adjacent clustering (e.g., gathering parts with the same parent-id
* across the message).
*
* @example
* ```tsx
* // Group by parent ID (default behavior)
* <MessagePrimitive.Unstable_PartsGrouped
*   components={{
*     Text: ({ text }) => <p className="message-text">{text}</p>,
*     Image: ({ image }) => <img src={image} alt="Message image" />,
*     Group: ({ groupKey, indices, children }) => {
*       if (!groupKey) return <>{children}</>;
*       return (
*         <div className="parent-group border rounded p-4">
*           <h4>Parent ID: {groupKey}</h4>
*           {children}
*         </div>
*       );
*     }
*   }}
* />
* ```
*/
const MessagePrimitiveUnstable_PartsGrouped = ({ groupingFunction, components }) => {
	const contentLength = useAuiState((s) => s.message.parts.length);
	const messageGroups = useMessagePartsGrouped(groupingFunction);
	return /* @__PURE__ */ jsx(Fragment, { children: useMemo(() => {
		if (contentLength === 0) return /* @__PURE__ */ jsx(EmptyParts, { components });
		return messageGroups.map((group, groupIndex) => {
			return /* @__PURE__ */ jsx(components?.Group ?? defaultComponents.Group, {
				groupKey: group.groupKey,
				indices: group.indices,
				children: group.indices.map((partIndex) => /* @__PURE__ */ jsx(MessagePart, {
					partIndex,
					components
				}, partIndex))
			}, `group-${groupIndex}-${group.groupKey ?? "ungrouped"}`);
		});
	}, [
		messageGroups,
		components,
		contentLength
	]) });
};
MessagePrimitiveUnstable_PartsGrouped.displayName = "MessagePrimitive.Unstable_PartsGrouped";
/**
* Renders the parts of a message grouped by their parent ID.
* This is a convenience wrapper around Unstable_PartsGrouped with parent ID grouping.
*
* @deprecated Use MessagePrimitive.Unstable_PartsGrouped instead for more flexibility
*/
const MessagePrimitiveUnstable_PartsGroupedByParentId = ({ components, ...props }) => {
	return /* @__PURE__ */ jsx(MessagePrimitiveUnstable_PartsGrouped, {
		...props,
		components,
		groupingFunction: groupMessagePartsByParentId
	});
};
MessagePrimitiveUnstable_PartsGroupedByParentId.displayName = "MessagePrimitive.Unstable_PartsGroupedByParentId";
//#endregion
export { MessagePrimitiveUnstable_PartsGrouped, MessagePrimitiveUnstable_PartsGroupedByParentId };

//# sourceMappingURL=MessagePartsGrouped.js.map