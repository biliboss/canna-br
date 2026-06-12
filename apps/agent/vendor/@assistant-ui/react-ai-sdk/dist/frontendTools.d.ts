import { ToolSet } from "ai";
import { ToolJSONSchema } from "assistant-stream";

//#region src/frontendTools.d.ts
declare const defaultToModelOutput: ({
  output
}: {
  output: unknown;
}) => {
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
} | {
  type: "text";
  value: string;
} | {
  type: "json";
  value: import("ai").JSONValue;
};
declare const frontendTools: (tools: Record<string, ToolJSONSchema>) => ToolSet;
//#endregion
export { defaultToModelOutput, frontendTools };
//# sourceMappingURL=frontendTools.d.ts.map