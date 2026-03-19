import { useState } from "react";
import { workflows } from "@/client/scenarios.ts";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { ChevronRight } from "lucide-react";

export const workflowRailClasses = {
  cardOpen:
    "bg-white/82 border-[rgba(42,122,138,0.14)] shadow-[0_1px_4px_rgba(42,122,138,0.06)]",
  cardActive:
    "bg-[rgba(42,122,138,0.08)] border-[rgba(42,122,138,0.22)] shadow-[0_0_0_1px_rgba(42,122,138,0.10)]",
  promptRow:
    "border border-transparent bg-[rgba(42,122,138,0.04)] text-foreground transition-colors hover:bg-[rgba(42,122,138,0.08)]",
} as const;

interface ScenarioSidebarProps {
  onSend: (query: string) => void;
  disabled: boolean;
  activeQuery?: string | null;
}

export function ScenarioSidebar({ onSend, disabled, activeQuery }: ScenarioSidebarProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeWorkflowId = activeQuery
    ? workflows.find((w) =>
        w.scenarios.some((s) => s.query === activeQuery) ||
        w.examples.some((e) => e === activeQuery),
      )?.id ?? null
    : null;

  return (
    <aside
      data-testid="workflow-rail"
      className={cn(
        "relative z-10 order-2 flex h-11 w-full shrink-0 items-center gap-1.5 overflow-x-auto border-t border-white/30 bg-white/40 px-2 backdrop-blur-sm",
        "md:order-none md:h-auto md:w-[13rem] md:flex-col md:items-stretch md:gap-1.5 md:overflow-x-visible md:overflow-y-hidden md:border-t-0 md:border-r md:border-white/30 md:bg-transparent md:px-2 md:py-2 md:backdrop-blur-none",
      )}
    >
      <div className="hidden flex-col gap-0.5 px-1 md:flex">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2a7a8a]">
          Workflow rail
        </p>
        <h2 className="text-sm font-bold tracking-[-0.03em] text-[#0c2a32]">Pick a lane</h2>
        <p className="text-xs leading-4 text-[#2a7a8a]">Open one lane and run a prompt.</p>
      </div>

      {/* Mobile: flat horizontal chips */}
      <div className="flex gap-1.5 md:hidden">
        {workflows.map((w) => (
          <button
            key={w.id}
            type="button"
            className={cn(
              "shrink-0 whitespace-nowrap rounded bg-white/70 border border-white/50 px-2.5 py-1.5 text-xs font-semibold text-[#0c2a32] backdrop-blur-sm transition-colors hover:bg-white/40",
              activeWorkflowId === w.id && workflowRailClasses.cardActive,
            )}
            onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {/* Desktop: vertical collapsible lanes with scroll */}
      <ScrollArea className="hidden flex-1 md:block">
        <div className="flex flex-col gap-1">
          {workflows.map((w) => {
            const isExpanded = expandedId === w.id;
            const isActive = activeWorkflowId === w.id;
            return (
              <Collapsible
                key={w.id}
                open={isExpanded}
                onOpenChange={(open) => setExpandedId(open ? w.id : null)}
              >
                <div
                  data-testid={`workflow-card-${w.id}`}
                  className={cn(
                    "overflow-hidden rounded bg-white/70 border border-white/50 backdrop-blur-sm transition-all hover:shadow-[0_1px_6px_rgba(42,122,138,0.10)]",
                    isExpanded && workflowRailClasses.cardOpen,
                    isActive && !isExpanded && workflowRailClasses.cardActive,
                  )}
                >
                  <CollapsibleTrigger className="block w-full px-2.5 py-1.5 text-left transition-colors hover:bg-white/40">
                    <span className="block truncate text-xs font-semibold leading-5 text-[#0c2a32]" title={w.label}>
                      {w.label}
                    </span>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-black/[0.04] px-2 pb-1.5 pt-1">
                      <div className="flex flex-col gap-0.5">
                        {w.scenarios.map((s) => (
                          <Button
                            key={s.id}
                            variant="ghost"
                            size="sm"
                            className={`h-auto w-full justify-start rounded-sm px-2 py-1.5 text-left text-[11px] font-medium leading-4 ${workflowRailClasses.promptRow}`}
                            data-testid={`scenario-${s.id}`}
                            disabled={disabled}
                            onClick={() => onSend(s.query)}
                            title={s.query}
                          >
                            <span className="truncate flex-1">{s.query}</span>
                            <ChevronRight data-icon="inline-end" className="shrink-0 text-[#2a7a8a]" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
