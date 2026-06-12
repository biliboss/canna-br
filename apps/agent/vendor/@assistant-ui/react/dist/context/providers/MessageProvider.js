"use client";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { jsx } from "react/jsx-runtime";
import { ThreadMessageClient } from "@assistant-ui/core/store";
//#region src/context/providers/MessageProvider.tsx
const MessageProvider = ({ children, ...props }) => {
	return /* @__PURE__ */ jsx(AuiProvider, {
		value: useAui({ message: ThreadMessageClient(props) }),
		children
	});
};
//#endregion
export { MessageProvider };

//# sourceMappingURL=MessageProvider.js.map