import { useMemo, useRef } from "@assistant-ui/tap/react-shim";
import { resource } from "@assistant-ui/tap";
//#region src/mcp-apps/McpAppsRemoteHost.ts
async function postToHost(options, method, params) {
	const doFetch = options.fetch ?? fetch;
	const extraHeaders = typeof options.headers === "function" ? await options.headers() : options.headers ?? {};
	const res = await doFetch(options.url, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...extraHeaders
		},
		body: JSON.stringify({
			method,
			params
		})
	});
	if (!res.ok) throw new Error(`MCP App host request failed: ${res.status}`);
	return res.json();
}
/**
* Creates the default HTTP host for MCP App widgets.
*
* The host POSTs widget requests to the configured route as `{ method,
* params }`, using the method names expected by the assistant-ui MCP Apps
* guide.
*/
const useMcpAppsRemoteHost = (options) => {
	const optionsRef = useRef(options);
	optionsRef.current = options;
	return useMemo(() => ({
		loadResource: (params) => postToHost(optionsRef.current, "mcp-apps/read-resource", params),
		callTool: (params) => postToHost(optionsRef.current, "tools/call", params),
		readResource: (params) => postToHost(optionsRef.current, "resources/read", params),
		listResources: (params) => postToHost(optionsRef.current, "resources/list", params)
	}), []);
};
const McpAppsRemoteHost = resource(useMcpAppsRemoteHost);
//#endregion
export { McpAppsRemoteHost };

//# sourceMappingURL=McpAppsRemoteHost.js.map