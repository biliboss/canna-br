//#region src/toolOutputConversion.ts
const toAISDKContent = (parts) => ({
	type: "content",
	value: parts.map((part) => {
		if (part.type === "text") return {
			type: "text",
			text: part.text
		};
		return part.mediaType.startsWith("image/") ? {
			type: "image-data",
			data: part.data,
			mediaType: part.mediaType
		} : {
			type: "file-data",
			data: part.data,
			mediaType: part.mediaType,
			...part.filename !== void 0 && { filename: part.filename }
		};
	})
});
const toAISDKDefaultOutput = (output) => typeof output === "string" ? {
	type: "text",
	value: output
} : {
	type: "json",
	value: output ?? null
};
//#endregion
export { toAISDKContent, toAISDKDefaultOutput };

//# sourceMappingURL=toolOutputConversion.js.map