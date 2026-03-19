import { useState } from "react";
import { Streamdown } from "streamdown";
import type { AgentResponse } from "@/client/types.ts";
import type { Workflow } from "@/client/scenarios.ts";
import { workflows } from "@/client/scenarios.ts";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CircleAlert, Check, Copy, ChevronRight } from "lucide-react";

const cyanBadge = "border-[rgba(42,122,138,0.14)] bg-[rgba(42,122,138,0.08)] text-[8px] uppercase tracking-[0.1em] text-[#1a6a7a]";

export function AnswerView({
  content,
  isStreaming,
  testId,
}: {
  content: string;
  isStreaming: boolean;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="prose prose-sm max-w-none break-words text-foreground prose-headings:tracking-[-0.02em] prose-p:my-0 prose-p:text-xs prose-p:leading-5 prose-li:text-xs prose-li:leading-5 prose-table:text-xs [&_:not(pre)>code]:rounded-none [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-sans [&_:not(pre)>code]:text-[0.95em] [&_:not(pre)>code]:font-medium [&_:not(pre)>code]:text-foreground [&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none"
    >
      <Streamdown
        animated
        isAnimating={isStreaming}
        caret="block"
        controls
        mode={isStreaming ? "streaming" : "static"}
      >
        {content}
      </Streamdown>
    </div>
  );
}

/** Picks 3 example prompts from different workflows for the empty state */
function getIdlePrompts(): { query: string; lane: string }[] {
  const picks: { query: string; lane: string }[] = [];
  for (const w of workflows) {
    if (picks.length >= 3) break;
    const first = w.scenarios[0];
    if (first) picks.push({ query: first.query, lane: w.label });
  }
  return picks;
}

export function IdleView({
  workflowCount,
  onSend,
  disabled,
}: {
  workflowCount: number;
  onSend: (query: string) => void;
  disabled: boolean;
}) {
  const prompts = getIdlePrompts();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight text-[#0c2a32]">Ask the data</h2>
        <p className="text-xs/5 text-[#2a7a8a]">
          {`Pick a lane or type below. ${workflowCount} lanes stay available while the center stays focused on the active chat.`}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#2a7a8a]/60">Try a prompt</p>
        {prompts.map((p) => (
          <button
            key={p.query}
            type="button"
            disabled={disabled}
            onClick={() => onSend(p.query)}
            className="flex items-center gap-2 rounded bg-white/50 border border-white/40 px-2.5 py-1.5 text-left text-xs text-[#0c2a32] backdrop-blur-sm transition-colors hover:bg-white/70 disabled:opacity-50"
          >
            <span className="flex-1 truncate">{p.query}</span>
            <ChevronRight className="h-3 w-3 shrink-0 text-[#2a7a8a]" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function PendingView({ query }: { query: string }) {
  return (
    <Card size="sm" data-testid="pending-state">
      <CardHeader>
        <CardDescription>In progress</CardDescription>
        <CardTitle>Working</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs/5 text-muted-foreground">{query}</p>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-full bg-[rgba(42,122,138,0.08)]" />
          <Skeleton className="h-3 w-4/5 bg-[rgba(42,122,138,0.06)]" />
          <Skeleton className="h-3 w-3/5 bg-[rgba(42,122,138,0.04)]" />
        </div>
      </CardContent>
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function CompletedView({ response }: { response: AgentResponse }) {
  return (
    <Card data-testid="response-content">
      <CardHeader>
        <CardDescription className="flex items-center justify-between">
          <span>Final answer</span>
          <CopyButton text={response.answer} />
        </CardDescription>
        <CardTitle>Answer</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <Badge variant="outline" className={cyanBadge}>{response.agentUsed}</Badge>
          <Badge variant="outline" className={cyanBadge}>{response.confidence}</Badge>
        </div>
        <p className="text-xs/4 text-muted-foreground">
          {`Answered by the ${response.agentUsed} agent with ${response.confidence} confidence.`}
        </p>
        <AnswerView content={response.answer} isStreaming={false} />
      </CardContent>
    </Card>
  );
}

export function WorkflowBriefView({ workflow }: { workflow: Workflow }) {
  if (workflow.gaps.length === 0) return null;
  return (
    <Card size="sm" data-testid="workflow-brief">
      <CardHeader>
        <CardDescription>{workflow.label}</CardDescription>
        <CardTitle>Known limits</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {workflow.gaps.map((gap, i) => (
          <p key={i} className="text-xs/5">
            {gap}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

export function InspectorView({ response }: { response: AgentResponse }) {
  return (
    <div className="flex flex-col gap-3">
      <Card data-testid="tools-used">
        <CardHeader>
          <CardDescription>Execution</CardDescription>
          <CardTitle>Tools</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {response.toolsUsed.length > 0 ? (
            response.toolsUsed.map((tool, i) => (
              <p key={i} className="text-xs/5">
                {tool}
              </p>
            ))
          ) : (
            <p className="text-xs/4 text-muted-foreground">
              No tools were recorded for this answer.
            </p>
          )}
        </CardContent>
      </Card>
      <Card data-testid="reasoning">
        <CardHeader>
          <CardDescription>Trace</CardDescription>
          <CardTitle>Reasoning</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {response.reasoning.length > 0 ? (
            response.reasoning.map((step, i) => (
              <p key={i} className="text-xs/5">{`${i + 1}. ${step}`}</p>
            ))
          ) : (
            <p className="text-xs/4 text-muted-foreground">No reasoning trace was returned.</p>
          )}
        </CardContent>
      </Card>
      <Card data-testid="citations">
        <CardHeader>
          <CardDescription>Sources</CardDescription>
          <CardTitle>{`Citations (${response.citations.length})`}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {response.citations.length > 0 ? (
            response.citations.map((c, i) => (
              <p key={i} className="text-xs/5">{`${c.resourceType}/${c.id}`}</p>
            ))
          ) : (
            <p className="text-xs/4 text-muted-foreground">
              No citations were returned for this answer.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorView({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>Request failed</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
