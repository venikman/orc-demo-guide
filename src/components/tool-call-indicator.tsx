interface ToolCallIndicatorProps {
  name: string
  preview?: string
}

export function ToolCallIndicator({ name, preview }: ToolCallIndicatorProps) {
  return (
    <span
      data-testid="tool-call"
      data-tool={name}
      title={preview}
      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border"
    >
      <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
      {name}
    </span>
  )
}
