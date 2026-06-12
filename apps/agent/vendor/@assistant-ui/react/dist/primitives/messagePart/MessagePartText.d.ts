import { Primitive } from "../../utils/Primitive.js";
import { ComponentPropsWithoutRef, ComponentRef, ElementType } from "react";

//#region src/primitives/messagePart/MessagePartText.d.ts
declare namespace MessagePartPrimitiveText {
  type Element = ComponentRef<typeof Primitive.span>;
  type Props = Omit<ComponentPropsWithoutRef<typeof Primitive.span>, "children" | "asChild"> & {
    /**
     * Whether to enable smooth text streaming animation.
     * When enabled, text appears with a typing effect as it streams in.
     * @default true
     */
    smooth?: boolean;
    /**
     * The HTML element or React component to render as.
     * @default "span"
     */
    component?: ElementType;
  };
}
/**
 * Renders the text content of a message part with optional smooth streaming.
 *
 * This component displays text content from the current message part context,
 * with support for smooth streaming animation that shows text appearing
 * character by character as it's generated.
 *
 * @example
 * ```tsx
 * <MessagePartPrimitive.Text
 *   smooth={true}
 *   component="p"
 *   className="message-text"
 * />
 * ```
 */
declare const MessagePartPrimitiveText: import("react").ForwardRefExoticComponent<Omit<Omit<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLSpanElement>, "ref">, "children" | "asChild"> & {
  /**
   * Whether to enable smooth text streaming animation.
   * When enabled, text appears with a typing effect as it streams in.
   * @default true
   */
  smooth?: boolean;
  /**
   * The HTML element or React component to render as.
   * @default "span"
   */
  component?: ElementType;
} & import("react").RefAttributes<HTMLSpanElement>>;
//#endregion
export { MessagePartPrimitiveText };
//# sourceMappingURL=MessagePartText.d.ts.map