//#region src/ui/utils/toCreateMessage.ts
const toCreateMessage = (message) => {
	const parts = [...message.content.filter((c) => c.type !== "file"), ...message.attachments?.flatMap((a) => a.content.map((c) => ({
		...c,
		filename: a.name
	}))) ?? []].map((part) => {
		switch (part.type) {
			case "text": return {
				type: "text",
				text: part.text
			};
			case "image": return {
				type: "file",
				url: part.image,
				...part.filename && { filename: part.filename },
				mediaType: "image/png"
			};
			case "file": return {
				type: "file",
				url: part.data,
				mediaType: part.mimeType,
				...part.filename && { filename: part.filename }
			};
			case "data": return {
				type: `data-${part.name}`,
				data: part.data
			};
			default: throw new Error(`Unsupported part type: ${part.type}`);
		}
	});
	return {
		role: message.role,
		parts,
		metadata: message.metadata
	};
};
//#endregion
export { toCreateMessage };

//# sourceMappingURL=toCreateMessage.js.map