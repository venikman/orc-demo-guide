export function ReasoningPanel({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null

  return (
    <div data-testid="reasoning" className="space-y-1">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Reasoning
      </h4>
      <ol className="space-y-0.5 list-decimal list-inside">
        {steps.map((step, i) => (
          <li key={i} className="text-sm text-muted-foreground">
            {step}
          </li>
        ))}
      </ol>
    </div>
  )
}
