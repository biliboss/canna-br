import { cloneElement, forwardRef, isValidElement } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { Primitive as Primitive$1 } from "@radix-ui/react-primitive";
//#region src/utils/Primitive.tsx
/**
* Thin wrapper around `@radix-ui/react-primitive` that adds `render` prop support.
*
* When `render` is provided, it is converted to the equivalent `asChild` pattern:
*   render={<Comp props />} + children  →  asChild + <Comp props>{children}</Comp>
*
* All prop merging, ref composition, and event handler chaining remain handled
* by Radix's battle-tested Slot implementation — we add zero custom logic for that.
*/
const NODES = [
	"a",
	"button",
	"div",
	"form",
	"h2",
	"h3",
	"img",
	"input",
	"label",
	"li",
	"nav",
	"ol",
	"p",
	"select",
	"span",
	"svg",
	"ul"
];
function withRenderProp(Component) {
	const Wrapped = forwardRef(({ render, asChild, children, ...rest }, ref) => {
		const Comp = Component;
		if (render && isValidElement(render)) {
			const renderChildren = children !== void 0 ? children : render.props.children;
			return /* @__PURE__ */ jsx(Comp, {
				...rest,
				asChild: true,
				ref,
				children: cloneElement(render, void 0, renderChildren)
			});
		}
		return /* @__PURE__ */ jsx(Comp, {
			...rest,
			asChild,
			ref,
			children
		});
	});
	Wrapped.displayName = typeof Component === "string" ? Component : Component.displayName ?? Component.name ?? "Component";
	return Wrapped;
}
function createPrimitive(node) {
	const RadixComp = Primitive$1[node];
	const Component = withRenderProp(RadixComp);
	Component.displayName = `Primitive.${node}`;
	return Component;
}
const Primitive = NODES.reduce((acc, node) => {
	acc[node] = createPrimitive(node);
	return acc;
}, {});
//#endregion
export { Primitive, withRenderProp };

//# sourceMappingURL=Primitive.js.map