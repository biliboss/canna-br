import { CodeHeaderProps, SyntaxHighlighterProps } from "../overrides/types.js";
import { ComponentPropsWithoutRef, ComponentType, ElementType, ForwardRefExoticComponent, RefAttributes } from "react";
import { Options } from "react-markdown";
import { Primitive } from "@radix-ui/react-primitive";

//#region src/primitives/MarkdownText.d.ts
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;
type MarkdownTextPrimitiveProps = Omit<Options, "components" | "children"> & {
  className?: string | undefined;
  containerProps?: Omit<PrimitiveDivProps, "children" | "asChild"> | undefined;
  containerComponent?: ElementType | undefined;
  components?: (NonNullable<Options["components"]> & {
    SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
    CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
  }) | undefined;
  /**
   * Language-specific component overrides.
   * @example { mermaid: { SyntaxHighlighter: MermaidDiagram } }
   */
  componentsByLanguage?: Record<string, {
    CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
    SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  }> | undefined;
  smooth?: boolean | undefined;
  /**
   * Function to transform text before markdown processing.
   */
  preprocess?: (text: string) => string;
};
declare const MarkdownTextPrimitive: ForwardRefExoticComponent<MarkdownTextPrimitiveProps> & RefAttributes<HTMLDivElement>;
//#endregion
export { MarkdownTextPrimitive, MarkdownTextPrimitiveProps };
//# sourceMappingURL=MarkdownText.d.ts.map