"use client";
import { writableStore } from "../../context/ReadonlyStore.js";
import { useSmoothStatusStore } from "./SmoothContext.js";
import { useAui, useAuiState } from "@assistant-ui/store";
import { useEffect, useMemo, useRef, useState } from "@assistant-ui/tap/react-shim";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
//#region src/utils/smooth/useSmooth.ts
var TextStreamAnimator = class {
	currentText;
	setText;
	animationFrameId = null;
	lastUpdateTime = Date.now();
	targetText = "";
	constructor(currentText, setText) {
		this.currentText = currentText;
		this.setText = setText;
	}
	start() {
		if (this.animationFrameId !== null) return;
		this.lastUpdateTime = Date.now();
		this.animate();
	}
	stop() {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}
	animate = () => {
		const currentTime = Date.now();
		let timeToConsume = currentTime - this.lastUpdateTime;
		const remainingChars = this.targetText.length - this.currentText.length;
		const baseTimePerChar = Math.min(5, 250 / remainingChars);
		let charsToAdd = 0;
		while (timeToConsume >= baseTimePerChar && charsToAdd < remainingChars) {
			charsToAdd++;
			timeToConsume -= baseTimePerChar;
		}
		if (charsToAdd !== remainingChars) this.animationFrameId = requestAnimationFrame(this.animate);
		else this.animationFrameId = null;
		if (charsToAdd === 0) return;
		this.currentText = this.targetText.slice(0, this.currentText.length + charsToAdd);
		this.lastUpdateTime = currentTime - timeToConsume;
		this.setText(this.currentText);
	};
};
const SMOOTH_STATUS = Object.freeze({ type: "running" });
const useSmooth = (state, smooth = false) => {
	const { text } = state;
	const [displayedText, setDisplayedText] = useState(state.status.type === "running" ? "" : text);
	const aui = useAui();
	const part = useAuiState(() => aui.part());
	const [prevPart, setPrevPart] = useState(part);
	if (part !== prevPart || !text.startsWith(displayedText)) {
		setPrevPart(part);
		setDisplayedText(state.status.type === "running" ? "" : text);
	}
	const smoothStatusStore = useSmoothStatusStore({ optional: true });
	const setText = useCallbackRef((text) => {
		setDisplayedText(text);
		if (smoothStatusStore) {
			const target = displayedText !== text || state.status.type === "running" ? SMOOTH_STATUS : state.status;
			writableStore(smoothStatusStore).setState(target, true);
		}
	});
	useEffect(() => {
		if (smoothStatusStore) {
			const target = smooth && (displayedText !== text || state.status.type === "running") ? SMOOTH_STATUS : state.status;
			writableStore(smoothStatusStore).setState(target, true);
		}
	}, [
		smoothStatusStore,
		smooth,
		text,
		displayedText,
		state.status
	]);
	const [animatorRef] = useState(new TextStreamAnimator(displayedText, setText));
	const animatorPartRef = useRef(part);
	useEffect(() => {
		if (!smooth) {
			animatorRef.stop();
			return;
		}
		const partChanged = animatorPartRef.current !== part;
		animatorPartRef.current = part;
		if (partChanged || !text.startsWith(animatorRef.targetText)) {
			if (state.status.type === "running") {
				animatorRef.currentText = "";
				animatorRef.targetText = text;
				animatorRef.start();
			} else {
				animatorRef.currentText = text;
				animatorRef.targetText = text;
				animatorRef.stop();
			}
			return;
		}
		animatorRef.targetText = text;
		animatorRef.start();
	}, [
		animatorRef,
		smooth,
		text,
		state.status.type,
		part
	]);
	useEffect(() => {
		return () => {
			animatorRef.stop();
		};
	}, [animatorRef]);
	return useMemo(() => smooth ? {
		type: "text",
		text: displayedText,
		status: text === displayedText ? state.status : SMOOTH_STATUS
	} : state, [
		smooth,
		displayedText,
		state,
		text
	]);
};
//#endregion
export { useSmooth };

//# sourceMappingURL=useSmooth.js.map