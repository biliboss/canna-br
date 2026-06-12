import { ComponentPropsWithoutRef, ComponentRef } from "react";
import { Popover } from "radix-ui";

//#region src/primitives/assistantModal/AssistantModalAnchor.d.ts
declare namespace AssistantModalPrimitiveAnchor {
  type Element = ComponentRef<typeof Popover.Anchor>;
  type Props = ComponentPropsWithoutRef<typeof Popover.Anchor>;
}
declare const AssistantModalPrimitiveAnchor: import("react").ForwardRefExoticComponent<Omit<Popover.PopoverAnchorProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
//#endregion
export { AssistantModalPrimitiveAnchor };
//# sourceMappingURL=AssistantModalAnchor.d.ts.map