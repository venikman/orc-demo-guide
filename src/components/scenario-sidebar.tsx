import { useState } from "react"
import { workflows } from "@/client/scenarios.ts"
import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Separator } from "@/components/ui/separator.tsx"

interface ScenarioSidebarProps {
  onSend: (query: string) => void
  disabled: boolean
}

export function ScenarioSidebar({ onSend, disabled }: ScenarioSidebarProps) {
  const [customQuery, setCustomQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleSubmit = () => {
    const trimmed = customQuery.trim()
    if (!trimmed) return
    onSend(trimmed)
    setCustomQuery("")
  }

  return (
    <aside className="flex flex-col gap-2 border-r border-border w-80 shrink-0 overflow-y-auto">
      <div className="px-4 pt-4 pb-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Workflows
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-3">
        {workflows.map((w) => {
          const isExpanded = expandedId === w.id
          return (
            <div key={w.id}>
              {/* Workflow header */}
              <button
                type="button"
                className="flex items-center gap-2 w-full px-2 py-1 text-left group"
                onClick={() => setExpandedId(isExpanded ? null : w.id)}
              >
                <span className={`size-2 rounded-full ${w.color} shrink-0`} />
                <span className="text-sm font-medium flex-1">{w.label}</span>
                {w.gaps.length > 0 && (
                  <span className="text-[10px] text-yellow-600 bg-yellow-500/10 rounded px-1">
                    partial
                  </span>
                )}
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {isExpanded ? "−" : "+"}
                </span>
              </button>

              {/* Scenario buttons + details — visible when expanded */}
              {isExpanded && (
              <div className="flex flex-col gap-1 mt-1 ml-4">
                {w.scenarios.map((s) => (
                  <Button
                    key={s.id}
                    variant="ghost"
                    size="sm"
                    className="justify-start text-left h-auto py-1.5 px-2 font-normal text-xs"
                    data-testid={`scenario-${s.id}`}
                    disabled={disabled}
                    onClick={() => onSend(s.query)}
                  >
                    <span className="line-clamp-2">{s.query}</span>
                  </Button>
                ))}
              </div>
              )}

              {isExpanded && (
                <div className="ml-4 mt-1.5 space-y-2 pb-1">
                  <p className="text-xs text-muted-foreground px-2">
                    {w.description}
                  </p>

                  {w.examples.length > 0 && (
                    <div className="space-y-1 px-2">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        Also try
                      </span>
                      {w.examples.map((ex, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={disabled}
                          className="block w-full text-xs text-left px-2 py-1 rounded bg-muted/50 hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                          onClick={() => onSend(ex)}
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  )}

                  {w.gaps.length > 0 && (
                    <div className="space-y-1 px-2">
                      <span className="text-[10px] font-medium text-yellow-600 uppercase tracking-wide">
                        Data gaps
                      </span>
                      {w.gaps.map((g, i) => (
                        <p key={i} className="text-[11px] text-muted-foreground leading-tight">
                          {g}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Separator />

      <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
        <Input
          data-testid="custom-input"
          placeholder="Ask anything about the FHIR data..."
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
          }}
          disabled={disabled}
        />
        <Button
          data-testid="send-button"
          disabled={disabled || !customQuery.trim()}
          onClick={handleSubmit}
        >
          Send
        </Button>
      </div>
    </aside>
  )
}
