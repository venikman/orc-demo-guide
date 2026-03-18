export interface RenderTreeNode {
  component: string
  props?: Record<string, unknown>
  children: RenderTreeNode[]
}

export function node(
  component: string,
  props: Record<string, unknown> = {},
  children: RenderTreeNode[] = [],
): RenderTreeNode {
  return { component, props, children }
}
