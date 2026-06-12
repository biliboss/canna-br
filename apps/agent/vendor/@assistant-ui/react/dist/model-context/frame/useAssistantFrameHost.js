"use client";
import { AssistantFrameHost } from "@assistant-ui/core";
import { useEffect } from "@assistant-ui/tap/react-shim";
//#region src/model-context/frame/useAssistantFrameHost.ts
/**
* React hook that manages the lifecycle of an AssistantFrameHost and its binding to the current AssistantRuntime.
*
* Usage example:
* ```typescript
* function MyComponent() {
*   const iframeRef = useRef<HTMLIFrameElement>(null);
*
*   useAssistantFrameHost({
*     iframeRef,
*     targetOrigin: "https://trusted-domain.com", // optional
*   });
*
*   return <iframe ref={iframeRef} src="..." />;
* }
* ```
*/
const useAssistantFrameHost = ({ iframeRef, targetOrigin = "*", register }) => {
	useEffect(() => {
		const iframeWindow = iframeRef.current?.contentWindow;
		if (!iframeWindow) return;
		const frameHost = new AssistantFrameHost(iframeWindow, targetOrigin);
		const unsubscribe = register(frameHost);
		return () => {
			frameHost.dispose();
			unsubscribe();
		};
	}, [
		iframeRef,
		targetOrigin,
		register
	]);
};
//#endregion
export { useAssistantFrameHost };

//# sourceMappingURL=useAssistantFrameHost.js.map