import { useMemo, useState } from "react";
import "streamdown/styles.css";
import { useCopilot } from "./use-copilot.ts";
import { findWorkflowByQuery, workflows } from "./scenarios.ts";
import { ScenarioSidebar } from "@/components/scenario-sidebar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import {
  IdleView,
  PendingView,
  AnswerView,
  CompletedView,
  WorkflowBriefView,
  InspectorView,
  ErrorView,
} from "@/components/copilot-views.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { LoaderCircle, PanelRightClose, PanelRightOpen, SendHorizontal, X } from "lucide-react";

const cyanBadge = "border-[rgba(42,122,138,0.14)] bg-[rgba(42,122,138,0.08)] text-[8px] uppercase tracking-[0.1em] text-[#1a6a7a]";

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
    <TooltipProvider delay={300}>
      <div className="relative h-dvh overflow-hidden bg-[linear-gradient(175deg,#ffffff_0%,#daf0f5_40%,#b4e0ec_100%)] text-foreground">
        <div className="relative flex h-dvh flex-col md:flex-row">
          <ScenarioSidebar onSend={handleSend} disabled={isBusy} activeQuery={query} />

          <main className="order-1 flex min-h-0 flex-1 overflow-hidden">
            <section className="flex min-w-0 flex-1 flex-col">
              {/* Compact header */}
              <header className="shrink-0 border-b border-white/30 bg-white/50 px-4 py-0.5 backdrop-blur-sm xl:px-5">
                <div className="mx-auto flex w-full max-w-[72rem] items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Provider Copilot v2
                  </p>
                  <span className="text-[10px] text-muted-foreground/60">|</span>
                  <p className="text-[10px] text-muted-foreground">
                    Details on demand.
                  </p>

                  {state !== "idle" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto h-6 px-3 text-[10px]"
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
                  {/* Chat content with styled scroll */}
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="px-4 py-1.5 xl:px-5">
                      <div
                        data-testid="chat-stage"
                        className="mx-auto flex w-full max-w-[72rem] flex-col gap-1.5"
                      >
                        {state === "idle" && (
                          <div data-testid="idle-message" className="max-w-2xl pt-0.5">
                            <IdleView workflowCount={workflows.length} onSend={handleSend} disabled={isBusy} />
                          </div>
                        )}

                        {query && (
                          <div className="flex justify-end">
                            <div
                              data-testid="query-display"
                              className="max-w-[46rem] rounded border border-white/50 bg-white/60 px-3 py-1.5 text-xs leading-5 text-foreground backdrop-blur-sm"
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
                            <Card data-testid="streaming-content" className="animate-stream-pulse border-[rgba(42,122,138,0.25)]">
                              <CardHeader>
                                <CardDescription>Streaming</CardDescription>
                                <CardTitle>Answering</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <AnswerView content={partialAnswer} isStreaming={true} />
                              </CardContent>
                            </Card>
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
                              className={`flex flex-wrap items-center gap-1.5 ${transcriptColumnClassName}`}
                            >
                              <Tooltip>
                                <TooltipTrigger
                                  render={<span />}
                                  data-testid="agent-badge"
                                  data-agent={response.agentUsed}
                                  className="inline-flex"
                                >
                                  <Badge
                                    variant="outline"
                                    className={cyanBadge}
                                  >
                                    {response.agentUsed}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="text-[11px]">
                                  Routed to the {response.agentUsed} agent
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger
                                  render={<span />}
                                  data-testid="confidence-badge"
                                  className="inline-flex"
                                >
                                  <Badge
                                    variant="outline"
                                    className={cyanBadge}
                                  >
                                    {response.confidence}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="text-[11px]">
                                  Confidence level: {response.confidence}
                                </TooltipContent>
                              </Tooltip>
                              <Button
                                type="button"
                                variant={inspectorOpen ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setInspectorOpen((open) => !open)}
                                data-testid="inspector-toggle"
                                className="ml-auto h-7 px-2.5 text-xs"
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
                  </ScrollArea>

                  {/* Composer — frosted glass with auto-growing textarea */}
                  <div
                    data-testid="chat-composer"
                    className="shrink-0 border-t border-white/30 bg-white/40 px-3 py-1 backdrop-blur-sm sm:px-4 xl:px-5"
                  >
                    <div className="mx-auto flex w-full max-w-[72rem] items-end gap-2">
                      <Textarea
                        data-testid="custom-input"
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
                        rows={1}
                        className="min-h-8 max-h-32 flex-1 resize-none border-white/40 bg-white/50 py-1.5 text-xs text-[#0c2a32] shadow-none backdrop-blur-sm placeholder:text-[#2a7a8a]/40 focus-visible:border-[#2a7a8a]/30 focus-visible:ring-[#2a7a8a]/10"
                      />
                      <Button
                        data-testid="send-button"
                        disabled={isBusy || !draft.trim()}
                        onClick={() => handleSend(draft)}
                        className="h-8 min-w-16 px-3 text-xs"
                      >
                        {isBusy ? (
                          <LoaderCircle data-icon="inline-start" className="animate-spin" />
                        ) : (
                          <SendHorizontal data-icon="inline-start" />
                        )}
                        {isPending ? "Working" : isStreaming ? "Streaming" : "Send"}
                      </Button>
                    </div>
                    <p className="mx-auto max-w-[72rem] text-[9px] text-[#2a7a8a]/40">
                      Thread stays active until you clear it. Shift+Enter for a line break.
                    </p>
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
                    <InspectorView response={response!} />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}
