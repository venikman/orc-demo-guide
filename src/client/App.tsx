import { useMemo, useState } from "react";
import "streamdown/styles.css";
import { useCopilot } from "./use-copilot.ts";
import { findWorkflowByQuery, workflows } from "./scenarios.ts";
import { ScenarioSidebar } from "@/components/scenario-sidebar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog.tsx";
import {
  IdleView,
  PendingView,
  StreamingView,
  CompletedView,
  WorkflowBriefView,
  InspectorView,
  ErrorView,
} from "@/components/copilot-views.tsx";
import { LoaderCircle, PanelRightClose, PanelRightOpen, SendHorizontal, X } from "lucide-react";

export default function App() {
  const { turn, state, error, isPending, isStreaming, isBusy, send, reset } = useCopilot();
  const [draft, setDraft] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const response = turn?.response ?? null;
  const query = turn?.query ?? null;

  const partialAnswer = turn?.partialAnswer ?? null;
  const activeWorkflow = useMemo(() => (query ? findWorkflowByQuery(query) : null), [query]);
  const showInspector = Boolean(response);
  const transcriptColumnClassName = "w-full max-w-[54rem]";

  const handleSend = (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;

    setInspectorOpen(false);
    setDraft("");
    send(trimmed);
  };

  const handleReset = () => {
    setInspectorOpen(false);
    reset();
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.845_0.143_164.978_/_0.24),transparent_34%),linear-gradient(180deg,oklch(0.988_0.003_106.5),oklch(1_0_0))]" />

      <div className="relative flex h-dvh flex-col lg:flex-row">
        <ScenarioSidebar onSend={handleSend} disabled={isBusy} />

        <main className="order-1 flex min-h-0 flex-1 overflow-hidden">
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-border bg-background/95 px-5 py-3 backdrop-blur-sm xl:px-7">
              <div className="mx-auto flex w-full max-w-[72rem] items-center gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Provider Copilot v2
                  </p>
                  <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                    Chat-first. Details stay on demand.
                  </p>
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
                        <IdleView workflowCount={workflows.length} />
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

                    {activeWorkflow && (
                      <div className={transcriptColumnClassName}>
                        <WorkflowBriefView workflow={activeWorkflow} />
                      </div>
                    )}

                    {isPending && query && (
                      <div className={transcriptColumnClassName}>
                        <PendingView query={query} />
                      </div>
                    )}

                    {isStreaming && partialAnswer && (
                      <div className={transcriptColumnClassName}>
                        <StreamingView content={partialAnswer} />
                      </div>
                    )}

                    {error && (
                      <div className={transcriptColumnClassName}>
                        <ErrorView message={error} />
                      </div>
                    )}

                    {response && (
                      <>
                        <div
                          className={`flex flex-wrap items-center gap-2.5 ${transcriptColumnClassName}`}
                        >
                          <Badge
                            variant="outline"
                            data-testid="agent-badge"
                            data-agent={response.agentUsed}
                          >
                            {response.agentUsed}
                          </Badge>
                          <Badge variant="outline" data-testid="confidence-badge">
                            {response.confidence}
                          </Badge>
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
                          <CompletedView response={response} />
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
                        <textarea
                          data-testid="custom-input"
                          rows={1}
                          placeholder="Ask the FHIR data..."
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend(draft);
                            }
                          }}
                          disabled={isBusy}
                          className="flex field-sizing-content h-11 min-h-11 max-h-24 w-full resize-none rounded-none border-0 bg-transparent px-0 py-1.5 text-sm leading-6 shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <Button
                          data-testid="send-button"
                          disabled={isBusy || !draft.trim()}
                          onClick={() => handleSend(draft)}
                          size="lg"
                          className="min-w-20 rounded-lg px-3.5"
                        >
                          {isBusy ? (
                            <LoaderCircle data-icon="inline-start" className="animate-spin" />
                          ) : (
                            <SendHorizontal data-icon="inline-start" />
                          )}
                          {isPending ? "Working" : isStreaming ? "Streaming" : "Send"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-1.5 text-[10px] leading-4 text-muted-foreground">
                        <p>Thread stays active until you clear it.</p>
                        <p>
                          {isBusy
                            ? "Waiting for the final answer."
                            : "Shift+Enter for a line break."}
                        </p>
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
                  <div className="flex flex-col gap-2 rounded-none bg-muted/40 px-4 py-4 text-sm leading-6 text-muted-foreground ring-1 ring-foreground/10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Session memory
                    </p>
                    <p>Follow-up questions keep the same thread until you clear the session.</p>
                  </div>
                  <InspectorView response={response} />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
