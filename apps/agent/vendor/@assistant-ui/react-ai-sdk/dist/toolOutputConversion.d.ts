import { JSONValue } from "ai";
import { ToolModelContentPart } from "assistant-stream";

//#region src/toolOutputConversion.d.ts
declare const toAISDKContent: (parts: readonly ToolModelContentPart[]) => {
  type: "content";
  value: ({
    type: "text";
    text: string;
    data?: never;
    mediaType?: never;
  } | {
    type: "image-data";
    data: string;
    mediaType: string;
    text?: never;
  } | {
    filename?: string;
    type: "file-data";
    data: string;
    mediaType: string;
    text?: never;
  })[];
};
declare const toAISDKDefaultOutput: (output: unknown) => {
  type: "text";
  value: string;
} | {
  type: "json";
  value: JSONValue;
};
//#endregion
export { toAISDKContent, toAISDKDefaultOutput };
//# sourceMappingURL=toolOutputConversion.d.ts.map