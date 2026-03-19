import { Streamdown } from "streamdown";
import type { AgentResponse } from "@/client/types.ts";
import type { Workflow } from "@/client/scenarios.ts";
import { cn } from "@/lib/utils.ts";
import { Badge } from "@/components/ui/badge.tsx";

const textVariantClasses = {
  body: "text-sm leading-6 text-foreground",
  lead: "text-sm leading-6 text-muted-foreground",
  muted: "text-sm leading-5 text-muted-foreground",
  caption: "text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground",
  code: "rounded-none bg-muted px-2.5 py-2 font-mono text-[12px] leading-5 text-foreground",
} as const;

function Text({
  text,
  variant = "body",
}: {
  text: string;
  variant?: keyof typeof textVariantClasses;
}) {
  return (
    <p
      className={cn(
        "min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]",
        textVariantClasses[variant],
      )}
    >
      {text}
    </p>
  );
}

const panelToneClasses = {
  default: "bg-card",
  accent: "bg-accent/35",
  muted: "bg-muted/60",
} as const;

function Panel({
  title,
  eyebrow,
  testId,
  tone = "default",
  compact = false,
  children,
}: {
  title?: string | null;
  eyebrow?: string | null;
  testId?: string;
  tone?: keyof typeof panelToneClasses;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      data-size={compact ? "sm" : undefined}
      className={cn(
        "flex w-full min-w-0 flex-col gap-4 overflow-hidden rounded-none py-4 text-xs/relaxed ring-1 ring-foreground/10 data-[size=sm]:gap-2 data-[size=sm]:py-3",
        panelToneClasses[tone],
      )}
    >
      {(eyebrow || title) && (
        <div className="grid auto-rows-min items-start gap-1 px-4 data-[size=sm]:px-3">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          {title && (
            <div className="text-base font-semibold tracking-[-0.02em] text-foreground">
              {title}
            </div>
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-3 px-4 [&_p]:break-words [&_p]:[overflow-wrap:anywhere]">
        {children}
      </div>
    </div>
  );
}

function MarkdownAnswer({ content, testId }: { content: string; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className="prose prose-sm max-w-none break-words text-foreground prose-headings:tracking-[-0.02em] prose-p:my-0 prose-p:text-sm prose-p:leading-6 prose-li:text-sm prose-li:leading-6 prose-table:text-sm [&_:not(pre)>code]:rounded-none [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-sans [&_:not(pre)>code]:text-[0.95em] [&_:not(pre)>code]:font-medium [&_:not(pre)>code]:text-foreground [&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none"
    >
      <Streamdown>{content}</Streamdown>
    </div>
  );
}

export function IdleView({ workflowCount }: { workflowCount: number }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight">Ask the data</h2>
      <Text
        text={`Pick a lane or type below. ${workflowCount} lanes stay available while the center stays focused on the active chat.`}
        variant="lead"
      />
      <Text text="Explainability stays off-canvas until you open it." variant="muted" />
    </div>
  );
}

export function PendingView({ query }: { query: string }) {
  return (
    <Panel title="Working" eyebrow="In progress" testId="pending-state" compact>
      <Text text={query} />
      <Text text="Routing to the best agent..." variant="muted" />
    </Panel>
  );
}

export function StreamingView({ content }: { content: string }) {
  return (
    <Panel title="Answering" eyebrow="Streaming" testId="streaming-content">
      <MarkdownAnswer content={content} />
    </Panel>
  );
}

export function CompletedView({ response }: { response: AgentResponse }) {
  return (
    <Panel title="Answer" eyebrow="Final answer" testId="response-content">
      <div className="flex gap-2">
        <Badge variant="outline">{response.agentUsed}</Badge>
        <Badge variant="secondary">{response.confidence}</Badge>
      </div>
      <Text
        text={`Answered by the ${response.agentUsed} agent with ${response.confidence} confidence.`}
        variant="muted"
      />
      <MarkdownAnswer content={response.answer} />
    </Panel>
  );
}

export function WorkflowBriefView({ workflow }: { workflow: Workflow }) {
  if (workflow.gaps.length === 0) return null;
  return (
    <Panel title="Known limits" eyebrow={workflow.label} testId="workflow-brief" compact>
      <div className="flex flex-col gap-2">
        {workflow.gaps.map((gap, i) => (
          <Text key={i} text={gap} />
        ))}
      </div>
    </Panel>
  );
}

export function InspectorView({ response }: { response: AgentResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Tools" eyebrow="Execution" testId="tools-used">
        <div className="flex flex-col gap-2">
          {response.toolsUsed.length > 0 ? (
            response.toolsUsed.map((tool, i) => <Text key={i} text={tool} />)
          ) : (
            <Text text="No tools were recorded for this answer." variant="muted" />
          )}
        </div>
      </Panel>
      <Panel title="Reasoning" eyebrow="Trace" testId="reasoning">
        <div className="flex flex-col gap-2">
          {response.reasoning.length > 0 ? (
            response.reasoning.map((step, i) => <Text key={i} text={`${i + 1}. ${step}`} />)
          ) : (
            <Text text="No reasoning trace was returned." variant="muted" />
          )}
        </div>
      </Panel>
      <Panel
        title={`Citations (${response.citations.length})`}
        eyebrow="Sources"
        testId="citations"
      >
        <div className="flex flex-col gap-2">
          {response.citations.length > 0 ? (
            response.citations.map((c, i) => <Text key={i} text={`${c.resourceType}/${c.id}`} />)
          ) : (
            <Text text="No citations were returned for this answer." variant="muted" />
          )}
        </div>
      </Panel>
    </div>
  );
}

export function ErrorView({ message }: { message: string }) {
  return (
    <div className="rounded-none border border-destructive/20 bg-card p-4">
      <p className="text-sm font-medium text-destructive">Request failed</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
