import { unwrapModelContentEnvelope } from "../../modelContentEnvelope.js";
import { getToolName, isToolUIPart } from "ai";
import { createMessageConverter } from "@assistant-ui/core/react";
import { isMcpAppUri } from "@assistant-ui/core";
//#region src/ui/utils/convertMessage.ts
function stripClosingDelimiters(json) {
	return json.replace(/[}\]"]+$/, "");
}
const MCP_APP_METADATA_CACHE_MAX = 100;
function extractMcpAppMetadata(part, cache) {
	if (!part || typeof part !== "object") return void 0;
	const meta = part.callProviderMetadata;
	const mcp = meta && typeof meta === "object" ? meta.mcp : void 0;
	const app = mcp && typeof mcp === "object" ? mcp.app : void 0;
	let a;
	if (app && typeof app === "object") a = app;
	else {
		const output = part.output;
		const outMeta = output && typeof output === "object" ? output._meta : void 0;
		const uiResourceUri = outMeta && typeof outMeta === "object" ? outMeta["ui/resourceUri"] : void 0;
		if (typeof uiResourceUri !== "string") return void 0;
		a = { resourceUri: uiResourceUri };
	}
	if (typeof a["resourceUri"] !== "string") return void 0;
	if (!isMcpAppUri(a["resourceUri"])) return void 0;
	const cached = cache?.get(a["resourceUri"]);
	if (cached) {
		cache.delete(a["resourceUri"]);
		cache.set(a["resourceUri"], cached);
		return cached;
	}
	const out = { resourceUri: a["resourceUri"] };
	if (typeof a["mimeType"] === "string") out.mimeType = a["mimeType"];
	if (Array.isArray(a["visibility"])) out.visibility = a["visibility"].filter((v) => v === "model" || v === "app");
	if (cache) {
		if (cache.size >= MCP_APP_METADATA_CACHE_MAX) {
			const oldest = cache.keys().next().value;
			if (oldest !== void 0) cache.delete(oldest);
		}
		cache.set(a["resourceUri"], out);
	}
	return out;
}
const hasOwn = (value, key) => Object.hasOwn(value, key);
const stabilizeToolArgsValue = (value, path, keyOrderByPath) => {
	if (Array.isArray(value)) return value.map((item, idx) => stabilizeToolArgsValue(item, `${path}[${idx}]`, keyOrderByPath));
	if (value && typeof value === "object") {
		const record = value;
		const currentKeys = Object.keys(record);
		const previousOrder = keyOrderByPath.get(path) ?? [];
		const previousOrderSet = new Set(previousOrder);
		const nextOrder = [...previousOrder.filter((key) => hasOwn(record, key)), ...currentKeys.filter((key) => !previousOrderSet.has(key))];
		keyOrderByPath.set(path, nextOrder);
		return Object.fromEntries(nextOrder.map((key) => [key, stabilizeToolArgsValue(record[key], `${path}.${key}`, keyOrderByPath)]));
	}
	return value;
};
function stableStringifyToolArgs(keyOrderCache, cacheKey, args) {
	const keyOrderByPath = keyOrderCache?.get(cacheKey) ?? /* @__PURE__ */ new Map();
	keyOrderCache?.set(cacheKey, keyOrderByPath);
	const stableArgs = stabilizeToolArgsValue(args, "$", keyOrderByPath);
	return JSON.stringify(stableArgs);
}
function getToolApprovalAndInterrupt(part, toolStatus) {
	if (part.approval && typeof part.approval.id === "string") {
		const { id, approved, reason, isAutomatic } = part.approval;
		return { approval: {
			id,
			...typeof approved === "boolean" && { approved },
			...typeof reason === "string" && { reason },
			...isAutomatic === true && { isAutomatic: true }
		} };
	}
	if (toolStatus?.type === "interrupt") return { interrupt: toolStatus.payload };
	return {};
}
function convertParts(message, metadata) {
	if (!message.parts || message.parts.length === 0) return [];
	const converted = message.parts.filter((p) => p.type !== "step-start" && (message.role !== "user" || p.type !== "file")).map((part) => {
		if (part.type === "text") return {
			type: "text",
			text: part.text
		};
		if (part.type === "reasoning") return {
			type: "reasoning",
			text: part.text
		};
		if (isToolUIPart(part)) {
			const toolName = getToolName(part);
			const toolCallId = part.toolCallId;
			const argsKeyOrderCacheKey = `${message.id}:${toolCallId}`;
			const rawInput = part.input;
			let args;
			if (rawInput != null && typeof rawInput === "object" && !Array.isArray(rawInput)) {
				args = rawInput;
				metadata.toolLastInputCache?.set(argsKeyOrderCacheKey, args);
			} else args = metadata.toolLastInputCache?.get(argsKeyOrderCacheKey) ?? {};
			let result;
			let modelContent;
			let isError = false;
			if (part.state === "output-available") {
				const unwrapped = unwrapModelContentEnvelope(part.output);
				result = unwrapped.result;
				modelContent = unwrapped.modelContent;
			} else if (part.state === "output-error") {
				isError = true;
				result = { error: part.errorText };
			} else if (part.state === "output-denied") {
				isError = true;
				result = { error: part.approval?.reason || "Tool approval denied" };
			}
			let argsText = stableStringifyToolArgs(metadata.toolArgsKeyOrderCache, argsKeyOrderCacheKey, args);
			if (part.state === "input-streaming") argsText = stripClosingDelimiters(argsText);
			else {
				metadata.toolArgsKeyOrderCache?.delete(argsKeyOrderCacheKey);
				if (part.state === "output-available" || part.state === "output-error" || part.state === "output-denied") metadata.toolLastInputCache?.delete(argsKeyOrderCacheKey);
			}
			const toolStatus = metadata.toolStatuses?.[toolCallId];
			const mcpApp = extractMcpAppMetadata(part, metadata.mcpAppMetadataCache);
			return {
				type: "tool-call",
				toolName,
				toolCallId,
				argsText,
				args,
				result,
				isError,
				...modelContent !== void 0 && { modelContent },
				...mcpApp && { mcp: { app: mcpApp } },
				...getToolApprovalAndInterrupt(part, toolStatus)
			};
		}
		if (part.type === "source-url") return {
			type: "source",
			sourceType: "url",
			id: part.sourceId,
			url: part.url,
			...part.title != null ? { title: part.title } : void 0,
			...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : void 0
		};
		if (part.type === "file") return {
			type: "file",
			data: part.url,
			mimeType: part.mediaType,
			...part.filename != null && { filename: part.filename }
		};
		if (part.type === "source-document") return {
			type: "source",
			sourceType: "document",
			id: part.sourceId,
			title: part.title,
			mediaType: part.mediaType,
			...part.filename != null ? { filename: part.filename } : void 0,
			...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : void 0
		};
		if (part.type.startsWith("data-")) return {
			type: "data",
			name: part.type.substring(5),
			data: part.data
		};
		console.warn(`Unsupported message part type: ${part.type}`);
		return null;
	}).filter(Boolean);
	const seenToolCallIds = /* @__PURE__ */ new Set();
	return converted.filter((part) => {
		if (part.type === "tool-call" && part.toolCallId != null) {
			if (seenToolCallIds.has(part.toolCallId)) return false;
			seenToolCallIds.add(part.toolCallId);
		}
		return true;
	});
}
const AISDKMessageConverter = createMessageConverter((message, metadata) => {
	const createdAt = /* @__PURE__ */ new Date();
	const content = convertParts(message, metadata);
	switch (message.role) {
		case "user": return {
			role: "user",
			id: message.id,
			createdAt,
			content,
			attachments: message.parts?.filter((p) => p.type === "file").map((part, idx) => ({
				id: idx.toString(),
				type: part.mediaType.startsWith("image/") ? "image" : "file",
				name: part.filename ?? "file",
				content: [part.mediaType.startsWith("image/") ? {
					type: "image",
					image: part.url,
					filename: part.filename
				} : {
					type: "file",
					filename: part.filename,
					data: part.url,
					mimeType: part.mediaType
				}],
				contentType: part.mediaType ?? "unknown/unknown",
				status: { type: "complete" }
			})),
			metadata: message.metadata
		};
		case "system":
		case "assistant": {
			const timing = metadata.messageTiming?.[message.id];
			const isOptimistic = message.role === "assistant" && message.id === metadata.optimisticMessageId;
			return {
				role: message.role,
				id: message.id,
				createdAt,
				content,
				metadata: {
					...message.metadata,
					...timing && { timing },
					...isOptimistic && { isOptimistic: true }
				}
			};
		}
		default:
			console.warn(`Unsupported message role: ${message.role}`);
			return [];
	}
});
//#endregion
export { AISDKMessageConverter };

//# sourceMappingURL=convertMessage.js.map