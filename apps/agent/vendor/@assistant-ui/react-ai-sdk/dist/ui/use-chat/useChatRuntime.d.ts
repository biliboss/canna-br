import { AISDKRuntimeAdapter, CustomToCreateMessageFunction } from "./useAISDKRuntime.js";
import { ChatInit } from "ai";
import { AssistantRuntime, ExternalStoreSharedOptions } from "@assistant-ui/core";
import { UIMessage as UIMessage$1 } from "@ai-sdk/react";
import { AssistantCloud } from "assistant-cloud";

//#region src/ui/use-chat/useChatRuntime.d.ts
type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage$1 = UIMessage$1> = ChatInit<UI_MESSAGE> & ExternalStoreSharedOptions & {
  cloud?: AssistantCloud | undefined;
  adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
  toCreateMessage?: CustomToCreateMessageFunction;
  onResume?: AISDKRuntimeAdapter["onResume"];
  joinStrategy?: AISDKRuntimeAdapter["joinStrategy"];
};
declare const useChatRuntime: <UI_MESSAGE extends UIMessage$1 = UIMessage$1>({
  cloud,
  ...options
}?: UseChatRuntimeOptions<UI_MESSAGE>) => AssistantRuntime;
//#endregion
export { UseChatRuntimeOptions, useChatRuntime };
//# sourceMappingURL=useChatRuntime.d.ts.map