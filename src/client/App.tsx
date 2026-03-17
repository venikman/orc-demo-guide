import { Streamdown } from "streamdown"
import "streamdown/styles.css"
import { useCopilot } from "./use-copilot.ts"
import { workflows } from "./scenarios.ts"
import { ScenarioSidebar } from "@/components/scenario-sidebar.tsx"
import { AgentBadge } from "@/components/agent-badge.tsx"
import { ConfidenceBadge } from "@/components/confidence-badge.tsx"
import { ToolCallIndicator } from "@/components/tool-call-indicator.tsx"
import { CitationsList } from "@/components/citations-list.tsx"
import { ReasoningPanel } from "@/components/reasoning-panel.tsx"
import { Separator } from "@/components/ui/separator.tsx"
import { Button } from "@/components/ui/button.tsx"

export default function App() {
  const { state, query, content, agentType, toolCalls, response, error, send, reset } =
    useCopilot()

  const isActive = state === "connecting" || state === "streaming"

  return (
    <div className="flex h-screen bg-background">
      <ScenarioSidebar onSend={send} disabled={isActive} />

      <main className="flex-1 flex flex-col overflow-hidden p-6">
        {state === "idle" && (
          <div className="flex-1 flex items-center justify-center" data-testid="idle-message">
            <div className="max-w-2xl space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">
                  Provider Copilot
                </h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Ask questions about attributed patients, care gaps, quality metrics, and
                  more. Pick a workflow from the sidebar or type your own query.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                {workflows.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-lg border border-border p-3 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${w.color} shrink-0`} />
                      <span className="text-sm font-medium">{w.label}</span>
                      {w.gaps.length > 0 && (
                        <span className="text-[10px] text-yellow-600 bg-yellow-500/10 rounded px-1 ml-auto">
                          partial
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {w.description}
                    </p>
                    {w.gaps.length > 0 && (
                      <div className="pt-1 border-t border-border space-y-0.5">
                        {w.gaps.map((g, i) => (
                          <p key={i} className="text-[11px] text-yellow-600/80 leading-tight">
                            {g}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {state !== "idle" && (
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
            {/* User query bubble */}
            {query && (
              <div className="flex justify-end">
                <div
                  data-testid="query-display"
                  className="rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground max-w-[75%]"
                >
                  {query}
                </div>
              </div>
            )}

            {/* Header: agent type + confidence */}
            <div className="flex items-center gap-2">
              {agentType && <AgentBadge agent={agentType} />}
              {response?.confidence && (
                <ConfidenceBadge confidence={response.confidence} />
              )}
              {isActive && (
                <span
                  data-testid="streaming-indicator"
                  className="ml-auto text-xs text-muted-foreground animate-pulse"
                >
                  Streaming...
                </span>
              )}
              {(state === "done" || state === "error") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={reset}
                  data-testid="reset-button"
                >
                  Clear
                </Button>
              )}
            </div>

            <Separator />

            {/* Streaming content */}
            {content && (
              <div data-testid="response-content" className="prose prose-sm max-w-none">
                <Streamdown>{content}</Streamdown>
              </div>
            )}

            {/* Tool calls */}
            {toolCalls.length > 0 && (
              <div data-testid="tool-calls" className="flex flex-wrap gap-1.5">
                {toolCalls.map((tc, i) => (
                  <ToolCallIndicator
                    key={`${tc.name}-${i}`}
                    name={tc.name}
                    preview={tc.preview}
                  />
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                data-testid="error-message"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            {/* Post-done details */}
            {response && (
              <>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <ReasoningPanel steps={response.reasoning} />
                  <CitationsList citations={response.citations} />
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
