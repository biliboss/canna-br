import { ComponentPropsWithoutRef, ComponentRef } from "react";
import { Popover } from "radix-ui";

//#region src/primitives/assistantModal/AssistantModalTrigger.d.ts
declare namespace AssistantModalPrimitiveTrigger {
  type Element = ComponentRef<typeof Popover.Trigger>;
  type Props = ComponentPropsWithoutRef<typeof Popover.Trigger>;
}
declare const AssistantModalPrimitiveTrigger: import("react").ForwardRefExoticComponent<Omit<Popover.PopoverTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;
//#endregion
export { AssistantModalPrimitiveTrigger };
//# sourceMappingURL=AssistantModalTrigger.d.ts.map