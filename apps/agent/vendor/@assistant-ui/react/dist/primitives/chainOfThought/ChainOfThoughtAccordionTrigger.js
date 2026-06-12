"use client";
import { createActionButton } from "../../utils/createActionButton.js";
import { useAui, useAuiState } from "@assistant-ui/store";
import { useCallback } from "@assistant-ui/tap/react-shim";
//#region src/primitives/chainOfThought/ChainOfThoughtAccordionTrigger.ts
const useChainOfThoughtAccordionTrigger = () => {
	const aui = useAui();
	const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
	return useCallback(() => {
		aui.chainOfThought().setCollapsed(!collapsed);
	}, [aui, collapsed]);
};
/**
* A button component that toggles the collapsed state of the chain of thought accordion.
*
* This component automatically handles the toggle functionality, expanding or collapsing
* the chain of thought parts when clicked.
*
* @example
* ```tsx
* <ChainOfThoughtPrimitive.AccordionTrigger>
*   Toggle Reasoning
* </ChainOfThoughtPrimitive.AccordionTrigger>
* ```
*/
const ChainOfThoughtPrimitiveAccordionTrigger = createActionButton("ChainOfThoughtPrimitive.AccordionTrigger", useChainOfThoughtAccordionTrigger);
//#endregion
export { ChainOfThoughtPrimitiveAccordionTrigger };

//# sourceMappingURL=ChainOfThoughtAccordionTrigger.js.map