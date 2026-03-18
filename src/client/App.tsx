import { useMemo, useState } from "react"
import "streamdown/styles.css"
import { useCopilot } from "./use-copilot.ts"
import { findWorkflowByQuery, workflows } from "./scenarios.ts"
import { ScenarioSidebar } from "@/components/scenario-sidebar.tsx"
import { AgentBadge } from "@/components/agent-badge.tsx"
import { ConfidenceBadge } from "@/components/confidence-badge.tsx"
import { Button } from "@/components/ui/button.tsx"
import { Card, CardContent } from "@/components/ui/card.tsx"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog.tsx"
import { Textarea } from "@/components/ui/textarea.tsx"
import { JsonRenderView } from "@/render/json-render-view.tsx"
import {
  buildCompletedSpec,
  buildErrorSpec,
  buildIdleSpec,
  buildInspectorSpec,
  buildPendingSpec,
  buildWorkflowBriefSpec,
} from "@/render/spec-builders.ts"
import { LoaderCircle, PanelRightClose, PanelRightOpen, SendHorizontal, X } from "lucide-react"

export default function App() {
  const { latestTurn, state, error, isPending, send, reset } = useCopilot()
  const [draft, setDraft] = useState("")
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const response = latestTurn?.response ?? null
  const query = latestTurn?.query ?? null

  const completedSpec = response ? buildCompletedSpec(response) : null
  const idleSpec = buildIdleSpec(workflows)
  const pendingSpec = query ? buildPendingSpec(query) : null
  const inspectorSpec = response ? buildInspectorSpec(response) : null
  const activeWorkflow = useMemo(() => (query ? findWorkflowByQuery(query) : null), [query])
  const workflowBriefSpec = useMemo(
    () => (activeWorkflow ? buildWorkflowBriefSpec(activeWorkflow) : null),
    [activeWorkflow],
  )
  const showInspector = Boolean(response && inspectorSpec)
  const transcriptColumnClassName = "w-full max-w-[54rem]"

  const handleSend = (nextQuery: string) => {
    const trimmed = nextQuery.trim()
    if (!trimmed) return

    setInspectorOpen(false)
    setDraft("")
    send(trimmed)
  }

  const handleReset = () => {
    setInspectorOpen(false)
    reset()
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.845_0.143_164.978_/_0.24),transparent_34%),linear-gradient(180deg,oklch(0.988_0.003_106.5),oklch(1_0_0))]" />

      <div className="relative flex h-dvh flex-col lg:flex-row">
        <ScenarioSidebar onSend={handleSend} disabled={isPending} />

        <main className="order-1 flex min-h-0 flex-1 overflow-hidden">
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-border bg-background/95 px-5 py-3 backdrop-blur-sm xl:px-7">
              <div className="mx-auto flex w-full max-w-[72rem] items-center gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Provider Copilot v2
                  </p>
                  <p className="mt-0.5 text-sm leading-5 text-muted-foreground">Chat-first. Details stay on demand.</p>
                </div>

                {state !== "idle" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto px-4"
                    onClick={handleReset}
                    data-testid="reset-button"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </header>

            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 xl:px-7">
                  <div
                    data-testid="chat-stage"
                    className="mx-auto flex w-full max-w-[72rem] flex-col gap-4"
                  >
                    {state === "idle" && (
                      <div data-testid="idle-message" className="max-w-2xl pt-6">
                        <JsonRenderView tree={idleSpec} />
                      </div>
                    )}

                    {query && (
                      <div className="flex justify-end">
                        <div
                          data-testid="query-display"
                          className="max-w-[46rem] rounded-none border border-border bg-card px-4 py-3 text-sm leading-6 text-card-foreground"
                        >
                          {query}
                        </div>
                      </div>
                    )}

                    {workflowBriefSpec && (
                      <div className={transcriptColumnClassName}>
                        <JsonRenderView tree={workflowBriefSpec} />
                      </div>
                    )}

                    {isPending && pendingSpec && (
                      <div className={transcriptColumnClassName}>
                        <JsonRenderView tree={pendingSpec} />
                      </div>
                    )}

                    {error && (
                      <div className={transcriptColumnClassName}>
                        <div
                          data-testid="error-message"
                          className="rounded-none border border-destructive/20 bg-card p-4"
                        >
                          <JsonRenderView tree={buildErrorSpec(error)} />
                        </div>
                      </div>
                    )}

                    {response && completedSpec && (
                      <>
                        <div className={`flex flex-wrap items-center gap-2.5 ${transcriptColumnClassName}`}>
                          <AgentBadge agent={response.agentUsed} />
                          <ConfidenceBadge confidence={response.confidence} />
                          <Button
                            type="button"
                            variant={inspectorOpen ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setInspectorOpen((open) => !open)}
                            data-testid="inspector-toggle"
                            className="ml-auto px-3"
                          >
                            {inspectorOpen ? (
                              <PanelRightClose data-icon="inline-start" />
                            ) : (
                              <PanelRightOpen data-icon="inline-start" />
                            )}
                            {inspectorOpen ? "Hide details" : "Show details"}
                          </Button>
                        </div>

                        <div className={transcriptColumnClassName}>
                          <JsonRenderView tree={completedSpec} />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div
                  data-testid="chat-composer"
                  className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-background/95 px-3 py-2 backdrop-blur-sm sm:px-5 xl:px-7"
                >
                  <div className="mx-auto w-full max-w-[72rem]">
                    <div className="rounded-none border border-border bg-card px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Textarea
                          data-testid="custom-input"
                          rows={1}
                          placeholder="Ask the FHIR data..."
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSend(draft)
                            }
                          }}
                          disabled={isPending}
                          className="h-11 min-h-11 max-h-24 resize-none rounded-none border-0 bg-transparent px-0 py-1.5 text-sm leading-6 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                        />
                        <Button
                          data-testid="send-button"
                          disabled={isPending || !draft.trim()}
                          onClick={() => handleSend(draft)}
                          size="lg"
                          className="min-w-20 rounded-lg px-3.5"
                        >
                          {isPending ? (
                            <LoaderCircle data-icon="inline-start" className="animate-spin" />
                          ) : (
                            <SendHorizontal data-icon="inline-start" />
                          )}
                          {isPending ? "Working" : "Send"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-1.5 text-[10px] leading-4 text-muted-foreground">
                        <p>Thread stays active until you clear it.</p>
                        <p>{isPending ? "Waiting for the final answer." : "Shift+Enter for a line break."}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {showInspector && (
        <Dialog open={inspectorOpen} onOpenChange={setInspectorOpen}>
          <DialogContent
            data-testid="inspector-panel"
            showCloseButton={false}
            side="right"
            className="overflow-hidden border-border bg-background p-0 sm:border"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Explainability
                  </p>
                  <DialogTitle className="mt-1 text-base font-semibold tracking-[-0.02em] text-foreground">
                    Trace details
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-xs leading-5 text-muted-foreground">
                    Reasoning, tools, and citations stay here so the transcript can stay clean.
                  </DialogDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="border border-border bg-background"
                  onClick={() => setInspectorOpen(false)}
                  data-testid="inspector-close"
                >
                  <X />
                  <span className="sr-only">Close details</span>
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4">
                <div className="flex flex-col gap-4">
                  <Card className="rounded-none bg-muted/40 shadow-none">
                    <CardContent className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Session memory
                      </p>
                      <p>Follow-up questions keep the same thread until you clear the session.</p>
                    </CardContent>
                  </Card>
                  <JsonRenderView tree={inspectorSpec} />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
