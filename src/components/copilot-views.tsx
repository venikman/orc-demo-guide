import { Streamdown } from "streamdown";
import type { AgentResponse } from "@/client/types.ts";
import type { Workflow } from "@/client/scenarios.ts";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { CircleAlert } from "lucide-react";

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
      className="prose prose-sm max-w-none break-words text-foreground prose-headings:tracking-[-0.02em] prose-p:my-0 prose-p:text-sm prose-p:leading-6 prose-li:text-sm prose-li:leading-6 prose-table:text-sm [&_:not(pre)>code]:rounded-none [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-sans [&_:not(pre)>code]:text-[0.95em] [&_:not(pre)>code]:font-medium [&_:not(pre)>code]:text-foreground [&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none"
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

export function IdleView({ workflowCount }: { workflowCount: number }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight">Ask the data</h2>
      <p className="text-sm/6 text-muted-foreground">
        {`Pick a lane or type below. ${workflowCount} lanes stay available while the center stays focused on the active chat.`}
      </p>
      <p className="text-sm/5 text-muted-foreground">
        Explainability stays off-canvas until you open it.
      </p>
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
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm/6">{query}</p>
        <p className="text-sm/5 text-muted-foreground">Routing to the best agent...</p>
      </CardContent>
    </Card>
  );
}

export function CompletedView({ response }: { response: AgentResponse }) {
  return (
    <Card data-testid="response-content">
      <CardHeader>
        <CardDescription>Final answer</CardDescription>
        <CardTitle>Answer</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Badge variant="outline">{response.agentUsed}</Badge>
          <Badge variant="secondary">{response.confidence}</Badge>
        </div>
        <p className="text-sm/5 text-muted-foreground">
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
      <CardContent className="flex flex-col gap-2">
        {workflow.gaps.map((gap, i) => (
          <p key={i} className="text-sm/6">
            {gap}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

export function InspectorView({ response }: { response: AgentResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <Card data-testid="tools-used">
        <CardHeader>
          <CardDescription>Execution</CardDescription>
          <CardTitle>Tools</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {response.toolsUsed.length > 0 ? (
            response.toolsUsed.map((tool, i) => (
              <p key={i} className="text-sm/6">
                {tool}
              </p>
            ))
          ) : (
            <p className="text-sm/5 text-muted-foreground">
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
        <CardContent className="flex flex-col gap-2">
          {response.reasoning.length > 0 ? (
            response.reasoning.map((step, i) => (
              <p key={i} className="text-sm/6">{`${i + 1}. ${step}`}</p>
            ))
          ) : (
            <p className="text-sm/5 text-muted-foreground">No reasoning trace was returned.</p>
          )}
        </CardContent>
      </Card>
      <Card data-testid="citations">
        <CardHeader>
          <CardDescription>Sources</CardDescription>
          <CardTitle>{`Citations (${response.citations.length})`}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {response.citations.length > 0 ? (
            response.citations.map((c, i) => (
              <p key={i} className="text-sm/6">{`${c.resourceType}/${c.id}`}</p>
            ))
          ) : (
            <p className="text-sm/5 text-muted-foreground">
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
