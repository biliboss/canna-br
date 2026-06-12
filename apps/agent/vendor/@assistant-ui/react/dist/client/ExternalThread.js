import { SingleThreadList } from "./SingleThreadList.js";
import { Derived, attachTransformScopes, useClientLookup, useClientResource } from "@assistant-ui/store";
import { DataRenderers, Tools } from "@assistant-ui/core/react";
import { useEffect, useEffectEvent, useMemo, useState } from "@assistant-ui/tap/react-shim";
import { ModelContext, Suggestions } from "@assistant-ui/core/store";
import { resource, withKey } from "@assistant-ui/tap";
//#region src/client/ExternalThread.ts
const EMPTY_QUEUE_ITEMS = [];
const useMessageClient = ({ message, index, onEdit, onReload, queue }) => {
	const [isCopied, setIsCopied] = useState(false);
	const [isHovering, setIsHovering] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const partClients = useClientLookup(() => message.content.map((part, idx) => withKey(idx, PartResource({ part }))), [message.content]);
	const attachmentClients = useClientLookup(() => (message.attachments ?? []).map((attachment) => withKey(attachment.id, AttachmentResource({
		attachment,
		onRemove: () => {}
	}))), [message.attachments]);
	const handleBeginEdit = () => {
		setIsEditing(true);
	};
	const handleCancelEdit = () => {
		setIsEditing(false);
	};
	const handleSendEdit = (msg) => {
		queue?.clear("edit");
		onEdit?.({
			...msg,
			parentId: message.id,
			sourceId: message.id
		});
		setIsEditing(false);
	};
	const composerClient = useClientResource(ComposerClientResource({
		type: "edit",
		isEditing,
		canCancel: true,
		onCancel: handleCancelEdit,
		onBeginEdit: handleBeginEdit,
		onSend: handleSendEdit,
		message,
		queue
	}));
	const state = useMemo(() => {
		return {
			...message,
			attachments: message.attachments ?? [],
			parentId: null,
			isLast: false,
			branchNumber: 1,
			branchCount: 1,
			speech: void 0,
			parts: partClients.state,
			isCopied,
			isHovering,
			index,
			composer: composerClient.state
		};
	}, [
		message,
		isCopied,
		isHovering,
		index,
		composerClient.state,
		partClients.state
	]);
	return {
		getState: () => state,
		composer: () => composerClient.methods,
		delete: () => {},
		reload: () => {
			onReload?.();
		},
		speak: () => {},
		stopSpeaking: () => {},
		submitFeedback: () => {},
		switchToBranch: () => {},
		getCopyText: () => message.content.map((c) => "text" in c ? c.text : "").join(""),
		part: (selector) => {
			if ("index" in selector) return partClients.get(selector);
			const partIndex = state.parts.findIndex((p) => p.type === "tool-call" && p.toolCallId === selector.toolCallId);
			return partClients.get({ index: partIndex });
		},
		attachment: (selector) => {
			if ("id" in selector) return attachmentClients.get({ key: selector.id });
			return attachmentClients.get(selector);
		},
		setIsCopied,
		setIsHovering
	};
};
const MessageClient = resource(useMessageClient);
const usePartResource = ({ part }) => {
	const state = useMemo(() => ({
		...part,
		status: { type: "complete" }
	}), [part]);
	return {
		getState: () => state,
		addToolResult: () => {},
		resumeToolCall: () => {},
		respondToToolApproval: () => {}
	};
};
const PartResource = resource(usePartResource);
const useAttachmentResource = ({ attachment, onRemove }) => {
	return {
		getState: () => attachment,
		remove: async () => {
			onRemove?.();
		}
	};
};
const AttachmentResource = resource(useAttachmentResource);
const useQueueItemClient = ({ item, onSteer, onRemove }) => {
	return {
		getState: () => item,
		steer: onSteer,
		remove: onRemove
	};
};
const QueueItemClient = resource(useQueueItemClient);
const useComposerClientResource = ({ type, isEditing, canCancel, isSendDisabled = false, onCancel, onBeginEdit, onSend, message, queue }) => {
	const [text, setText] = useState("");
	const [role, setRole] = useState("user");
	const [runConfig, setRunConfig] = useState({});
	const [attachments, setAttachments] = useState([]);
	const [quote, setQuote] = useState(void 0);
	const updateFromMessage = useEffectEvent(() => {
		if (message) {
			setText(message.content.filter((part) => part.type === "text").map((part) => "text" in part ? part.text : "").join("\n\n"));
			setRole(message.role);
			setAttachments(message.attachments ?? []);
		}
	});
	useEffect(() => {
		if (isEditing) updateFromMessage();
	}, [isEditing]);
	const attachmentClients = useClientLookup(() => attachments.map((attachment, idx) => withKey(attachment.id, AttachmentResource({
		attachment,
		onRemove: () => {
			setAttachments(attachments.filter((_, i) => i !== idx));
		}
	}))), [attachments]);
	const queueItems = queue?.items ?? EMPTY_QUEUE_ITEMS;
	const queueItemClients = useClientLookup(() => queueItems.map((item) => withKey(item.id, QueueItemClient({
		item,
		onSteer: () => queue?.steer(item.id),
		onRemove: () => queue?.remove(item.id)
	}))), [queueItems]);
	const state = useMemo(() => {
		const isEmpty = !text.trim() && !attachments.length;
		return {
			text,
			role,
			attachments: attachmentClients.state,
			runConfig,
			isEditing,
			canCancel,
			canSend: isEditing && !isEmpty && !isSendDisabled,
			attachmentAccept: "*",
			isEmpty,
			type,
			dictation: void 0,
			quote,
			queue: queueItems
		};
	}, [
		text,
		role,
		attachmentClients.state,
		runConfig,
		isEditing,
		canCancel,
		isSendDisabled,
		type,
		attachments.length,
		quote,
		queueItems
	]);
	return {
		getState: () => state,
		setText,
		setRole,
		setRunConfig,
		addAttachment: async (fileOrAttachment) => {
			if (fileOrAttachment instanceof File) {
				const newAttachment = {
					id: Math.random().toString(36).substring(7),
					type: "file",
					name: fileOrAttachment.name,
					contentType: fileOrAttachment.type,
					file: fileOrAttachment,
					status: { type: "complete" },
					content: []
				};
				setAttachments([...attachments, newAttachment]);
			} else {
				const newAttachment = {
					id: fileOrAttachment.id ?? Math.random().toString(36).substring(7),
					type: fileOrAttachment.type ?? "document",
					name: fileOrAttachment.name,
					contentType: fileOrAttachment.contentType,
					content: fileOrAttachment.content,
					status: { type: "complete" }
				};
				setAttachments([...attachments, newAttachment]);
			}
		},
		clearAttachments: async () => {
			setAttachments([]);
		},
		attachment: (selector) => {
			if ("id" in selector) return attachmentClients.get({ key: selector.id });
			return attachmentClients.get(selector);
		},
		reset: async () => {
			setText("");
			setRole("user");
			setRunConfig({});
			setAttachments([]);
			setQuote(void 0);
		},
		send: (opts) => {
			if (!state.canSend) return;
			const currentQuote = quote;
			const composedMessage = {
				role,
				content: text ? [{
					type: "text",
					text
				}] : [],
				attachments,
				createdAt: /* @__PURE__ */ new Date(),
				parentId: null,
				sourceId: null,
				runConfig,
				startRun: opts?.startRun,
				metadata: { custom: { ...currentQuote ? { quote: currentQuote } : {} } }
			};
			if (queue) queue.enqueue(composedMessage, { steer: opts?.steer ?? false });
			else onSend?.(composedMessage);
			setText("");
			setAttachments([]);
			setQuote(void 0);
		},
		cancel: onCancel,
		beginEdit: () => {
			onBeginEdit?.();
		},
		startDictation: () => {},
		stopDictation: () => {},
		setQuote,
		queueItem: (selector) => {
			return queueItemClients.get(selector);
		}
	};
};
const ComposerClientResource = resource(useComposerClientResource);
const useExternalThread = ({ messages, isRunning = false, isSendDisabled = false, onNew, onEdit, onReload, onStartRun, onCancel, queue }) => {
	const handleReload = (messageId) => {
		const messageIndex = messages.findIndex((m) => m.id === messageId);
		if (messageIndex === -1) return;
		const parentId = messageIndex > 0 ? messages[messageIndex - 1].id : null;
		queue?.clear("reload");
		onReload?.(parentId);
	};
	const messageClients = useClientLookup(() => messages.map((msg, index) => {
		const props = {
			message: msg,
			index,
			onReload: () => handleReload(msg.id),
			queue
		};
		if (onEdit) props.onEdit = onEdit;
		return withKey(msg.id, MessageClient(props));
	}), [
		messages,
		onEdit,
		queue
	]);
	const handleCancelRun = () => {
		queue?.clear("cancel-run");
		onCancel?.();
	};
	const handleSendNew = (message) => {
		onNew?.(message);
	};
	const composerClient = useClientResource(ComposerClientResource({
		type: "thread",
		isEditing: true,
		canCancel: isRunning,
		isSendDisabled,
		onCancel: handleCancelRun,
		onSend: handleSendNew,
		queue
	}));
	const hasQueue = !!queue;
	const state = useMemo(() => {
		const messageStates = messageClients.state.map((s, idx, arr) => ({
			...s,
			isLast: idx === arr.length - 1
		}));
		return {
			isEmpty: messages.length === 0,
			isDisabled: false,
			isLoading: false,
			isRunning,
			capabilities: {
				edit: false,
				delete: false,
				reload: false,
				cancel: isRunning,
				speech: false,
				attachments: false,
				feedback: false,
				voice: false,
				switchToBranch: false,
				switchBranchDuringRun: false,
				unstable_copy: false,
				dictation: false,
				queue: hasQueue
			},
			messages: messageStates,
			state: {},
			suggestions: [],
			extras: void 0,
			speech: void 0,
			voice: void 0,
			composer: composerClient.state
		};
	}, [
		messages,
		isRunning,
		hasQueue,
		messageClients.state,
		composerClient.state
	]);
	return {
		getState: () => state,
		composer: () => composerClient.methods,
		append: (message) => {
			const appendMessage = typeof message === "string" ? {
				createdAt: /* @__PURE__ */ new Date(),
				parentId: messages.at(-1)?.id ?? null,
				sourceId: null,
				runConfig: {},
				role: "user",
				content: [{
					type: "text",
					text: message
				}],
				attachments: [],
				metadata: { custom: {} }
			} : {
				createdAt: message.createdAt ?? /* @__PURE__ */ new Date(),
				parentId: message.parentId ?? messages.at(-1)?.id ?? null,
				sourceId: message.sourceId ?? null,
				role: message.role ?? "user",
				content: message.content,
				attachments: message.attachments ?? [],
				metadata: message.metadata ?? { custom: {} },
				runConfig: message.runConfig ?? {},
				startRun: message.startRun
			};
			if (queue) queue.enqueue(appendMessage, { steer: false });
			else onNew?.(appendMessage);
		},
		deleteMessage: () => {},
		startRun: () => {
			onStartRun?.();
		},
		resumeRun: () => {},
		cancelRun: handleCancelRun,
		getModelContext: () => ({
			tools: {},
			config: {}
		}),
		export: () => ({ messages: [] }),
		import: () => {},
		reset: () => {},
		message: (selector) => {
			if ("id" in selector) return messageClients.get({ key: selector.id });
			return messageClients.get(selector);
		},
		stopSpeaking: () => {},
		connectVoice: () => {},
		disconnectVoice: () => {},
		getVoiceVolume: () => 0,
		subscribeVoiceVolume: () => () => {},
		muteVoice: () => {},
		unmuteVoice: () => {}
	};
};
const ExternalThread = resource(useExternalThread);
attachTransformScopes(useExternalThread, (scopes, parent) => {
	if (!scopes.threads && parent.threads.source === null) {
		const threadElement = scopes.thread;
		scopes.threads = SingleThreadList({ thread: threadElement });
		scopes.thread = Derived({
			source: "threads",
			query: { type: "main" },
			get: (aui) => aui.threads().thread("main")
		});
	}
	if (!scopes.threadListItem && parent.threadListItem.source === null) scopes.threadListItem = Derived({
		source: "threads",
		query: { type: "main" },
		get: (aui) => aui.threads().item("main")
	});
	scopes.composer ??= Derived({
		source: "thread",
		query: {},
		get: (aui) => aui.thread().composer()
	});
	if (!scopes.modelContext && parent.modelContext.source === null) scopes.modelContext = ModelContext();
	if (!scopes.tools && parent.tools.source === null) scopes.tools = Tools({});
	if (!scopes.dataRenderers && parent.dataRenderers.source === null) scopes.dataRenderers = DataRenderers();
	if (!scopes.suggestions && parent.suggestions.source === null) scopes.suggestions = Suggestions();
});
//#endregion
export { ExternalThread };

//# sourceMappingURL=ExternalThread.js.map