import { unwrapModelContentEnvelope } from "./modelContentEnvelope.js";
import { toAISDKContent, toAISDKDefaultOutput } from "./toolOutputConversion.js";
import { jsonSchema } from "ai";
//#region src/frontendTools.ts
const defaultToModelOutput = ({ output }) => {
	const { result, modelContent } = unwrapModelContentEnvelope(output);
	if (modelContent !== void 0) return toAISDKContent(modelContent);
	return toAISDKDefaultOutput(result);
};
const frontendTools = (tools) => Object.fromEntries(Object.entries(tools).map(([name, t]) => [name, {
	...t.description !== void 0 && { description: t.description },
	inputSchema: jsonSchema(t.parameters),
	toModelOutput: defaultToModelOutput,
	...t.providerOptions && { providerOptions: t.providerOptions }
}]));
//#endregion
export { defaultToModelOutput, frontendTools };

//# sourceMappingURL=frontendTools.js.map