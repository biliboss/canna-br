//#region src/utils/getSelectionMessageId.ts
const findMessageId = (node) => {
	let el = node instanceof HTMLElement ? node : node?.parentElement ?? null;
	while (el) {
		const id = el.getAttribute("data-message-id");
		if (id) return id;
		el = el.parentElement;
	}
	return null;
};
const getSelectionMessageId = (selection) => {
	const { anchorNode, focusNode } = selection;
	if (!anchorNode || !focusNode) return null;
	const anchorId = findMessageId(anchorNode);
	const focusId = findMessageId(focusNode);
	if (!anchorId || anchorId !== focusId) return null;
	return anchorId;
};
//#endregion
export { getSelectionMessageId };

//# sourceMappingURL=getSelectionMessageId.js.map