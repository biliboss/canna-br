"use client";
import { useDropdownMenuScope } from "./scope.js";
import { jsx } from "react/jsx-runtime";
import { DropdownMenu } from "radix-ui";
//#region src/primitives/threadListItemMore/ThreadListItemMoreRoot.tsx
const ThreadListItemMorePrimitiveRoot = ({ __scopeThreadListItemMore, ...rest }) => {
	const scope = useDropdownMenuScope(__scopeThreadListItemMore);
	return /* @__PURE__ */ jsx(DropdownMenu.Root, {
		...scope,
		...rest
	});
};
ThreadListItemMorePrimitiveRoot.displayName = "ThreadListItemMorePrimitive.Root";
//#endregion
export { ThreadListItemMorePrimitiveRoot };

//# sourceMappingURL=ThreadListItemMoreRoot.js.map