"use client";
import { useCallback, useEffect, useRef, useState } from "@assistant-ui/tap/react-shim";
//#region src/legacy-runtime/runtime-cores/assistant-transport/replayBoundaryStream.ts
const REPLAY_CONTENT_LENGTH_HEADER = "Aui-Replay-Content-Length";
const useReplayRenderWait = () => {
	const [renderTicket, setRenderTicket] = useState(0);
	const mountedRef = useRef(true);
	const nextTicketRef = useRef(0);
	const waitersRef = useRef([]);
	const resolveWaiters = useCallback((committedTicket) => {
		const pendingWaiters = [];
		for (const waiter of waitersRef.current) if (committedTicket === void 0 || waiter.ticket <= committedTicket) waiter.resolve();
		else pendingWaiters.push(waiter);
		waitersRef.current = pendingWaiters;
	}, []);
	useEffect(() => {
		mountedRef.current = true;
		resolveWaiters(renderTicket);
	}, [renderTicket, resolveWaiters]);
	useEffect(() => () => {
		mountedRef.current = false;
		resolveWaiters();
	}, [resolveWaiters]);
	return useCallback(() => new Promise((resolve) => {
		setTimeout(() => {
			if (!mountedRef.current) {
				resolve();
				return;
			}
			const ticket = nextTicketRef.current + 1;
			nextTicketRef.current = ticket;
			waitersRef.current.push({
				ticket,
				resolve
			});
			setRenderTicket(ticket);
		}, 0);
	}), []);
};
const parseReplayContentLength = (headers) => {
	const raw = headers.get(REPLAY_CONTENT_LENGTH_HEADER);
	if (raw == null) return 0;
	const boundary = Number(raw);
	return Number.isSafeInteger(boundary) && boundary > 0 ? boundary : 0;
};
const createReplayBoundaryStream = async (response, { setReplaying, waitForRender: waitForReplayRender }) => {
	const body = response.body;
	const replayContentLength = parseReplayContentLength(response.headers);
	if (replayContentLength <= 0) return body;
	setReplaying(true);
	await waitForReplayRender();
	const reader = body.getReader();
	let bytesForwarded = 0;
	let replayFinished = false;
	const finishReplay = async () => {
		if (replayFinished) return;
		replayFinished = true;
		await waitForReplayRender();
		setReplaying(false);
		await waitForReplayRender();
	};
	return new ReadableStream({
		async pull(controller) {
			const { done, value } = await reader.read();
			if (done) {
				await finishReplay();
				controller.close();
				return;
			}
			if (replayFinished) {
				controller.enqueue(value);
				return;
			}
			const nextBytesForwarded = bytesForwarded + value.byteLength;
			if (nextBytesForwarded < replayContentLength) {
				bytesForwarded = nextBytesForwarded;
				controller.enqueue(value);
				return;
			}
			if (nextBytesForwarded === replayContentLength) {
				controller.enqueue(value);
				await finishReplay();
				return;
			}
			const replayBytesInChunk = replayContentLength - bytesForwarded;
			controller.enqueue(value.subarray(0, replayBytesInChunk));
			await finishReplay();
			controller.enqueue(value.subarray(replayBytesInChunk));
		},
		async cancel(reason) {
			const wasFinished = replayFinished;
			replayFinished = true;
			if (!wasFinished) setReplaying(false);
			await reader.cancel(reason);
		}
	});
};
//#endregion
export { REPLAY_CONTENT_LENGTH_HEADER, createReplayBoundaryStream, useReplayRenderWait };

//# sourceMappingURL=replayBoundaryStream.js.map