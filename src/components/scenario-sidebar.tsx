import { useState } from "react"
import { workflows } from "@/client/scenarios.ts"
import { Button } from "@/components/ui/button.tsx"
import { cn } from "@/lib/utils.ts"
import { ChevronRight, Minus, Plus } from "lucide-react"

const workflowLaneDotClasses = {
  "care-gaps": "bg-red-500",
  quality: "bg-emerald-500",
  utilization: "bg-violet-500",
  membership: "bg-blue-500",
  clinical: "bg-orange-500",
  reconciliation: "bg-teal-500",
} as const

const workflowRailClasses = {
  cardOpen: "border-primary/20 bg-accent/35",
  actionChip:
    "border border-border bg-background text-muted-foreground transition-colors group-hover:bg-muted",
  partialBadge:
    "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
  promptRow:
    "border border-transparent bg-muted/45 text-foreground transition-colors hover:border-border hover:bg-accent",
} as const

interface ScenarioSidebarProps {
  onSend: (query: string) => void
  disabled: boolean
}

export function ScenarioSidebar({ onSend, disabled }: ScenarioSidebarProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <aside
      data-testid="workflow-rail"
      className="relative z-10 order-2 flex max-h-[38dvh] w-full shrink-0 flex-col gap-3 overflow-hidden border-t border-border bg-sidebar/85 px-3 py-3 backdrop-blur-sm lg:order-none lg:h-dvh lg:max-h-none lg:w-[16.25rem] lg:border-t-0 lg:border-r"
    >
      <div className="flex flex-col gap-2 px-2">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Workflow rail
          </p>
          <h2 className="text-base font-semibold tracking-[-0.03em] text-foreground">
            Pick a lane
          </h2>
        </div>
        <p className="text-sm leading-5 text-muted-foreground">
          Open one lane and run a prompt.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-1">
        {workflows.map((w) => {
          const isExpanded = expandedId === w.id
          const laneDotClass =
            workflowLaneDotClasses[w.id as keyof typeof workflowLaneDotClasses] ??
            "bg-[color:var(--brand-600)]"
          return (
            <div
              key={w.id}
              data-testid={`workflow-card-${w.id}`}
              className={cn(
                "overflow-hidden rounded-none border border-border/70 bg-card",
                isExpanded && workflowRailClasses.cardOpen,
              )}
            >
              <button
                type="button"
                className="group block w-full px-3 py-3 text-left transition-colors hover:bg-muted/45"
                onClick={() => setExpandedId(isExpanded ? null : w.id)}
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${laneDotClass}`} />
                  <div className="min-w-0">
                    <span
                      className="block truncate text-sm font-semibold leading-5 text-foreground"
                      title={w.label}
                    >
                      {w.label}
                    </span>
                    {w.gaps.length > 0 && (
                      <span
                        className={`inline-flex rounded-none px-1.5 py-0 text-[9px] uppercase tracking-[0.18em] ${workflowRailClasses.partialBadge}`}
                      >
                        partial
                      </span>
                    )}
                  </div>
                  <span
                    data-testid={`workflow-toggle-${w.id}`}
                    className={`mt-0.5 inline-flex items-center gap-1 self-start justify-self-end rounded-none px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${workflowRailClasses.actionChip}`}
                  >
                    {isExpanded ? "Hide" : "Open"}
                    {isExpanded ? <Minus className="size-3" /> : <Plus className="size-3" />}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border/70 px-2.5 pb-2.5 pt-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center">
                      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Click a prompt
                      </span>
                    </div>
                    {w.scenarios.map((s) => (
                      <Button
                        key={s.id}
                        variant="ghost"
                        size="sm"
                        className={`h-auto w-full justify-start rounded-none px-3 py-2 text-left text-[12px] font-medium leading-5 ${workflowRailClasses.promptRow}`}
                        data-testid={`scenario-${s.id}`}
                        disabled={disabled}
                        onClick={() => onSend(s.query)}
                      >
                        <span className="line-clamp-2 flex-1">{s.query}</span>
                        <ChevronRight data-icon="inline-end" className="text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
