import { JSONUIProvider, Renderer, type Spec } from "@json-render/react";
import { useMemo } from "react";
import { copilotRegistry } from "./registry.tsx";
import type { RenderTreeNode } from "./types.ts";

function toSpec(rootNode: RenderTreeNode): Spec {
  let currentId = 0;
  const elements: Spec["elements"] = {};

  const visit = (node: RenderTreeNode): string => {
    const id = `node-${currentId++}`;
    const childIds = node.children.map(visit);

    elements[id] = {
      type: node.component,
      props: node.props ?? {},
      children: childIds,
    };

    return id;
  };

  const root = visit(rootNode);

  return { root, elements };
}

export function JsonRenderView({ tree }: { tree: RenderTreeNode }) {
  const spec = useMemo(() => toSpec(tree), [tree]);

  return (
    <JSONUIProvider registry={copilotRegistry}>
      <Renderer spec={spec} registry={copilotRegistry} />
    </JSONUIProvider>
  );
}
