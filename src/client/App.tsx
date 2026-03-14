import {
  FormEvent,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { FetchStreamTransport, useStream } from "@langchain/langgraph-sdk/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type {
  SearchResponseEnvelope,
  SearchStreamState,
} from "../../validation-schema";
import {
  PUBLIC_DATA_DEFAULT_QUERY,
  PUBLIC_DATASET_LABEL,
} from "../shared/public-dataset-meta";

const DEFAULT_QUERY = PUBLIC_DATA_DEFAULT_QUERY;

function formatTokenValue(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "—";
  }

  return value.toLocaleString();
}

function compactTraceTitle(title: string) {
  if (title.includes("Receive")) return "Receive query";
  if (title.includes("Parse intent")) return "Extract intent";
  if (title.includes("Resolve clinical")) return "Resolve terms";
  if (title.includes("Resolve scope")) return "Resolve scope";
  if (title.includes("Execute deterministic")) return "Execute query";
  if (title.includes("Apply")) return "Apply decision";
  if (title.includes("Validate")) return "Validate evidence";
  if (title.includes("Build")) return "Emit payload";
  return title;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[8px] border border-border/70 bg-background/55 p-3.5">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[6px] border border-border/60 bg-background/45 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="text-right text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function CollapsibleCard({
  id,
  title,
  description,
  badge,
  children,
  size = "default",
  className,
  contentClassName,
}: {
  id: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
  size?: "default" | "sm";
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card size={size} className={className}>
      <Accordion multiple defaultValue={[id]} keepMounted>
        <AccordionItem value={id} className="border-0">
          <CardHeader className="gap-0 border-b border-border/60">
            <AccordionTrigger className="gap-3 py-0 hover:no-underline">
              <div className="space-y-1 text-left">
                <CardTitle>{title}</CardTitle>
                {description ? <CardDescription>{description}</CardDescription> : null}
              </div>
              {badge}
            </AccordionTrigger>
          </CardHeader>
          <AccordionContent className="pb-0">
            <CardContent className={cn("pt-4", contentClassName)}>{children}</CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

const FLOW_GROUPS: Record<
  SearchResponseEnvelope["status"],
  Array<{
    key: string;
    title: string;
    traceIds: string[];
    dataId: string;
  }>
> = {
  success: [
    { key: "intake", title: "Intake", traceIds: ["receive"], dataId: "intake" },
    {
      key: "planning",
      title: "Planning",
      traceIds: ["parse", "terms"],
      dataId: "planning",
    },
    { key: "scope", title: "Scope", traceIds: ["scope"], dataId: "scope" },
    {
      key: "retrieval",
      title: "Retrieval",
      traceIds: ["query"],
      dataId: "retrieval",
    },
    {
      key: "visibility",
      title: "Visibility",
      traceIds: ["decision", "validate"],
      dataId: "visibility",
    },
    { key: "delivery", title: "Delivery", traceIds: ["artifact"], dataId: "delivery" },
  ],
  clarify: [
    { key: "intake", title: "Intake", traceIds: ["receive"], dataId: "intake" },
    { key: "planning", title: "Planning", traceIds: ["parse"], dataId: "planning" },
    { key: "clarify", title: "Clarify", traceIds: ["clarify"], dataId: "clarify" },
  ],
  deny: [
    { key: "intake", title: "Intake", traceIds: ["receive"], dataId: "intake" },
    { key: "planning", title: "Planning", traceIds: [], dataId: "planning" },
    { key: "policy", title: "Policy", traceIds: ["policy"], dataId: "policy" },
  ],
};

function CombinedFlowDiagram({
  response,
}: {
  response: SearchResponseEnvelope;
}) {
  const stages = FLOW_GROUPS[response.status].map((group) => ({
    ...group,
    traceSteps: response.trace.filter((step) => group.traceIds.includes(step.id)),
    dataStage: response.monitoring.dataFlow.find((stage) => stage.id === group.dataId),
  }));

  return (
    <CollapsibleCard
      id="runtime-map"
      title="Runtime map"
      description="Each block shows the agent action and the data state it produced."
      badge={<Badge variant="outline">{stages.length} stages</Badge>}
      className="self-start"
    >
      <div className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
        {stages.map((stage, index) => (
          <div
            key={stage.key}
            className="rounded-[8px] border border-border/65 bg-background/45"
          >
            <Accordion multiple defaultValue={[stage.key]} keepMounted>
              <AccordionItem value={stage.key} className="border-0">
                <div className="px-3.5 pt-3.5">
                  <AccordionTrigger className="gap-3 py-0 hover:no-underline">
                    <div className="space-y-1 text-left">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Stage {index + 1}
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {stage.title}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {stage.traceSteps.length} step{stage.traceSteps.length > 1 ? "s" : ""}
                    </Badge>
                  </AccordionTrigger>
                </div>

                <AccordionContent className="pb-0">
                  <div className="space-y-2.5 px-3.5 pb-3.5 pt-3.5">
                    <div className="rounded-[6px] border border-border/60 bg-muted/15 p-2.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Agent execution
                      </div>
                      <div className="mt-3 space-y-2.5">
                        {stage.traceSteps.map((step) => (
                          <div
                            key={step.id}
                            className="rounded-[6px] border border-border/55 bg-background/55 p-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-foreground">
                                  {compactTraceTitle(step.title)}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {step.agent}
                                </div>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {step.timeLabel}
                              </div>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {stage.dataStage ? (
                      <div className="rounded-[6px] border border-border/60 bg-muted/15 p-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            Data movement
                          </div>
                          {stage.dataStage.countLabel ? (
                            <div className="text-[11px] text-muted-foreground">
                              {stage.dataStage.countLabel}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm font-medium text-foreground">
                          {stage.dataStage.title}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {stage.dataStage.detail}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}

export function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const hasBootedRef = useRef(false);
  const transport = useMemo(
    () =>
      new FetchStreamTransport<SearchStreamState>({
        apiUrl: "/api/search/stream",
      }),
    [],
  );
  const searchStream = useStream<SearchStreamState>({
    transport,
    initialValues: {
      prompt: DEFAULT_QUERY,
      presetId: "provider",
      response: null,
    },
  });
  const response = searchStream.values.response ?? null;
  const loading = searchStream.isLoading;
  const error =
    searchStream.error instanceof Error
      ? searchStream.error.message
      : searchStream.error
        ? String(searchStream.error)
        : null;

  const submitSearch = useEffectEvent(async (nextQuery: string) => {
    await searchStream.submit(
      {
        prompt: nextQuery,
        presetId: "provider",
      },
      {
        optimisticValues: {
          prompt: nextQuery,
          presetId: "provider",
          response: null,
        },
      },
    );
  });

  useEffect(() => {
    if (hasBootedRef.current) {
      return;
    }

    hasBootedRef.current = true;
    void submitSearch(DEFAULT_QUERY);
  }, [submitSearch]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submitSearch(query);
  }

  const payloadPreview = useMemo(() => {
    if (!response?.results.length) {
      return [];
    }

    return response.results.slice(0, response.previewCount).map((result) => ({
      name: result.name,
      patientIdentifier: result.patientIdentifier,
      locationName: result.locationName,
      encounterLabel: result.encounterLabel,
      explanation: result.explanations[0]?.text ?? result.encounterLabel,
    }));
  }, [response]);

  const visibleFieldCount = response
    ? Object.values(response.policyDecision.field_visibility).filter(
        (value) => value === "visible",
      ).length
    : 0;
  const redactedFieldCount = response
    ? Object.values(response.policyDecision.field_visibility).filter(
        (value) => value === "redacted",
      ).length
    : 0;
  const hiddenFieldCount = response
    ? Object.values(response.policyDecision.field_visibility).filter(
        (value) => value === "hidden",
      ).length
    : 0;
  const stageCount = response ? FLOW_GROUPS[response.status].length : 0;

  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <Card>
          <CardHeader className="gap-4 border-b border-border/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">Agent search runtime</CardTitle>
                  <Badge variant="outline">{PUBLIC_DATASET_LABEL}</Badge>
                  <Badge variant="outline">Prototype</Badge>
                  {response ? (
                    <Badge variant="outline" className="capitalize">
                      {response.status}
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="max-w-3xl">
                  One learning surface for how the agent plans the query, moves data through the
                  pipeline, applies policy, and emits a deterministic cohort payload.
                </CardDescription>
              </div>
            </div>

            <form className="flex flex-col gap-3 md:flex-row" onSubmit={onSubmit}>
              <label htmlFor="cohort-query" className="sr-only">
                Cohort request
              </label>
              <Input
                id="cohort-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Describe the cohort request"
                className="h-12 flex-1 border-border/80 bg-background/65"
              />
              <Button type="submit" disabled={loading} className="h-12 md:w-40">
                {loading ? "Running..." : "Run agent"}
              </Button>
            </form>

            {response ? (
              <div className="flex flex-wrap gap-2">
                {response.plan.filters.map((filter) => (
                  <Badge key={`${filter.type}-${filter.value}`} variant="outline">
                    {filter.type}: {filter.canonicalValue ?? filter.value}
                  </Badge>
                ))}
                <Badge variant="outline">{response.monitoring.aiUsage.model ?? "pending"}</Badge>
                <Badge variant="outline">{response.monitoring.aiUsage.transport}</Badge>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Matched"
                value={String(response?.stats.matched ?? 0)}
                hint="final visible encounters"
              />
              <MetricCard
                label="Filters"
                value={String(response?.plan.filters.length ?? 0)}
                hint="compiled from the prompt"
              />
              <MetricCard
                label="Stages"
                value={String(stageCount)}
                hint="agent + data blocks"
              />
              <MetricCard
                label="Latency"
                value={`${response?.stats.latencyMs ?? 0} ms`}
                hint="prompt to payload"
              />
            </div>

            {response ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[8px] border border-border/70 bg-background/55 px-3.5 py-2.5 text-xs text-muted-foreground">
                <span>
                  Framework{" "}
                  <span className="font-medium text-foreground">
                    {response.monitoring.aiUsage.framework}
                  </span>
                </span>
                <span>
                  Runtime{" "}
                  <span className="font-medium text-foreground">
                    {response.monitoring.aiUsage.runtime}
                  </span>
                </span>
                <span>
                  Provider{" "}
                  <span className="font-medium text-foreground">
                    {response.monitoring.aiUsage.provider}
                  </span>
                </span>
                <span>
                  Tokens{" "}
                  <span className="font-medium text-foreground">
                    {formatTokenValue(response.monitoring.aiUsage.totalTokens)}
                  </span>
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {response ? (
          <>
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_300px]">
              <CombinedFlowDiagram response={response} />

              <div className="space-y-6">
                <CollapsibleCard
                  id="compiled-plan"
                  size="sm"
                  title="Compiled plan"
                  description="The structured request the agent produced from the prompt."
                >
                  <div className="space-y-3">
                    <InfoRow label="Intent" value={response.plan.intent} />
                    <InfoRow label="Plan status" value={response.plan.status} />
                    <InfoRow label="Output mode" value={response.plan.outputMode} />

                    <div className="rounded-[6px] border border-border/60 bg-background/45 p-2.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Summary
                      </div>
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        {response.plan.summary ?? response.interpretedSummary}
                      </p>
                    </div>

                    {response.plan.missingFields.length ? (
                      <div className="rounded-[6px] border border-border/60 bg-background/45 p-2.5">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          Needs clarification
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {response.plan.missingFields.map((field) => (
                            <Badge key={field} variant="outline">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CollapsibleCard>

                <CollapsibleCard
                  id="policy"
                  size="sm"
                  title="Policy"
                  description="Runtime decisioning and field visibility after planning."
                >
                  <div className="space-y-3">
                    <InfoRow label="Action" value={response.policyDecision.action} />
                    <InfoRow
                      label="Effective scopes"
                      value={String(response.policyDecision.effective_scopes.length)}
                    />
                    <InfoRow label="Visible fields" value={String(visibleFieldCount)} />
                    <InfoRow label="Redacted fields" value={String(redactedFieldCount)} />
                    <InfoRow label="Hidden fields" value={String(hiddenFieldCount)} />

                    <div className="rounded-[6px] border border-border/60 bg-background/45 p-2.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Reason
                      </div>
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        {response.policyDecision.reason}
                      </p>
                    </div>
                  </div>
                </CollapsibleCard>

                <CollapsibleCard
                  id="ai-usage"
                  size="sm"
                  title="AI usage"
                  description="Minimal runtime accounting for the model pass."
                >
                  <div className="space-y-3">
                    <InfoRow label="Framework" value={response.monitoring.aiUsage.framework} />
                    <InfoRow label="Runtime" value={response.monitoring.aiUsage.runtime} />
                    <InfoRow label="Provider" value={response.monitoring.aiUsage.provider} />
                    <InfoRow
                      label="Prompt tokens"
                      value={formatTokenValue(response.monitoring.aiUsage.inputTokens)}
                    />
                    <InfoRow
                      label="Completion tokens"
                      value={formatTokenValue(response.monitoring.aiUsage.outputTokens)}
                    />
                    <InfoRow
                      label="Total tokens"
                      value={formatTokenValue(response.monitoring.aiUsage.totalTokens)}
                    />
                  </div>
                </CollapsibleCard>
              </div>
            </div>

            <CollapsibleCard
              id="payload-preview"
              title="Payload preview"
              description="Final deterministic output after planning, policy, retrieval, and field filtering."
            >
              <div>
                {response.status === "success" ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[24%]">Member</TableHead>
                        <TableHead className="w-[16%]">Location</TableHead>
                        <TableHead className="w-[26%]">Encounter</TableHead>
                        <TableHead>Primary explanation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payloadPreview.map((result, index) => (
                        <TableRow key={`${result.patientIdentifier}-${index}`}>
                          <TableCell className="py-3">
                            <div className="font-medium text-foreground">{result.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Patient ID {result.patientIdentifier}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground">
                            {result.locationName}
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground">
                            {result.encounterLabel}
                          </TableCell>
                          <TableCell className="py-3 text-sm leading-6 text-muted-foreground">
                            {result.explanation}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3}>
                          Showing {payloadPreview.length} of {response.totalResults} encounters
                        </TableCell>
                        <TableCell className="text-right">
                          {response.monitoring.aiUsage.transport}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                ) : (
                  <div className="rounded-[6px] border border-border/70 bg-background/55 p-3 text-sm leading-6 text-muted-foreground">
                    {response.status === "clarify"
                      ? response.clarificationQuestion
                      : response.denialReason}
                  </div>
                )}
              </div>
            </CollapsibleCard>
          </>
        ) : null}
      </section>
    </main>
  );
}
