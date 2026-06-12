import { Derived, attachTransformScopes, useClientLookup, useClientResource } from "@assistant-ui/store";
import { DataRenderers, Tools } from "@assistant-ui/core/react";
import { useMemo, useState } from "@assistant-ui/tap/react-shim";
import { ModelContext, Suggestions } from "@assistant-ui/core/store";
import { resource, withKey } from "@assistant-ui/tap";
//#region src/client/InMemoryThreadList.ts
const RESOLVED_PROMISE = Promise.resolve();
const useThreadListItemClient = (props) => {
	const { data, onSwitchTo, onUpdateCustom, onArchive, onUnarchive, onDelete } = props;
	const state = useMemo(() => ({
		id: data.id,
		remoteId: void 0,
		externalId: void 0,
		title: data.title,
		status: data.status,
		custom: data.custom
	}), [
		data.id,
		data.title,
		data.status,
		data.custom
	]);
	return {
		getState: () => state,
		switchTo: onSwitchTo,
		rename: () => {},
		updateCustom: onUpdateCustom,
		archive: onArchive,
		unarchive: onUnarchive,
		delete: onDelete,
		generateTitle: () => {},
		initialize: async () => ({
			remoteId: data.id,
			externalId: void 0
		}),
		detach: () => {}
	};
};
const ThreadListItemClient = resource(useThreadListItemClient);
const useInMemoryThreadList = (props) => {
	const { thread: threadFactory, onSwitchToThread, onSwitchToNewThread } = props;
	const [mainThreadId, setMainThreadId] = useState("main");
	const [threads, setThreads] = useState(() => [{
		id: "main",
		title: "Main Thread",
		status: "regular"
	}]);
	const handleSwitchToThread = (threadId) => {
		setMainThreadId(threadId);
		onSwitchToThread?.(threadId);
	};
	const handleArchive = (threadId) => {
		setThreads((prev) => prev.map((t) => t.id === threadId ? {
			...t,
			status: "archived"
		} : t));
	};
	const handleUnarchive = (threadId) => {
		setThreads((prev) => prev.map((t) => t.id === threadId ? {
			...t,
			status: "regular"
		} : t));
	};
	const handleUpdateCustom = (threadId, custom) => {
		setThreads((prev) => prev.map((t) => t.id === threadId ? {
			...t,
			custom
		} : t));
	};
	const handleDelete = (threadId) => {
		setThreads((prev) => prev.filter((t) => t.id !== threadId));
		if (mainThreadId === threadId) setMainThreadId(threads.filter((t) => t.id !== threadId)[0]?.id || "main");
	};
	const handleSwitchToNewThread = () => {
		const newId = `thread-${Date.now()}`;
		setThreads((prev) => [...prev, {
			id: newId,
			title: "New Thread",
			status: "regular"
		}]);
		setMainThreadId(newId);
		onSwitchToNewThread?.();
	};
	const threadListItems = useClientLookup(() => threads.map((t) => withKey(t.id, ThreadListItemClient({
		data: t,
		onSwitchTo: () => handleSwitchToThread(t.id),
		onUpdateCustom: (custom) => handleUpdateCustom(t.id, custom),
		onArchive: () => handleArchive(t.id),
		onUnarchive: () => handleUnarchive(t.id),
		onDelete: () => handleDelete(t.id)
	}))), [threads]);
	const mainThreadClient = useClientResource(threadFactory(mainThreadId));
	const state = useMemo(() => {
		const regularThreads = threads.filter((t) => t.status === "regular");
		const archivedThreads = threads.filter((t) => t.status === "archived");
		return {
			mainThreadId,
			newThreadId: null,
			isLoading: false,
			isLoadingMore: false,
			hasMore: false,
			threadIds: regularThreads.map((t) => t.id),
			archivedThreadIds: archivedThreads.map((t) => t.id),
			threadItems: threadListItems.state,
			main: mainThreadClient.state
		};
	}, [
		mainThreadId,
		threads,
		threadListItems.state,
		mainThreadClient.state
	]);
	return {
		getState: () => state,
		switchToThread: handleSwitchToThread,
		switchToNewThread: handleSwitchToNewThread,
		getLoadThreadsPromise: () => RESOLVED_PROMISE,
		reload: () => RESOLVED_PROMISE,
		loadMore: () => RESOLVED_PROMISE,
		item: (selector) => {
			if (selector === "main") {
				const index = threads.findIndex((t) => t.id === mainThreadId);
				return threadListItems.get({ index: index === -1 ? 0 : index });
			}
			if ("id" in selector) {
				const index = threads.findIndex((t) => t.id === selector.id);
				return threadListItems.get({ index });
			}
			return threadListItems.get(selector);
		},
		thread: () => mainThreadClient.methods
	};
};
const InMemoryThreadList = resource(useInMemoryThreadList);
attachTransformScopes(useInMemoryThreadList, (scopes, parent) => {
	scopes.thread ??= Derived({
		source: "threads",
		query: { type: "main" },
		get: (aui) => aui.threads().thread("main")
	});
	scopes.threadListItem ??= Derived({
		source: "threads",
		query: { type: "main" },
		get: (aui) => aui.threads().item("main")
	});
	scopes.composer ??= Derived({
		source: "thread",
		query: {},
		get: (aui) => aui.threads().thread("main").composer()
	});
	if (!scopes.modelContext && parent.modelContext.source === null) scopes.modelContext = ModelContext();
	if (!scopes.tools && parent.tools.source === null) scopes.tools = Tools({});
	if (!scopes.dataRenderers && parent.dataRenderers.source === null) scopes.dataRenderers = DataRenderers();
	if (!scopes.suggestions && parent.suggestions.source === null) scopes.suggestions = Suggestions();
});
//#endregion
export { InMemoryThreadList };

//# sourceMappingURL=InMemoryThreadList.js.map