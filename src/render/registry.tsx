import { defineRegistry, type BaseComponentProps } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { Streamdown } from "streamdown";
import { copilotCatalog } from "./catalog.ts";
import { Badge as UIBadge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";

type PanelProps = {
  title: string | null;
  eyebrow: string | null;
  testId: string | null;
  tone: "default" | "accent" | "muted" | null;
  size: "default" | "compact" | null;
};

type MarkdownAnswerProps = {
  content: string;
  testId: string | null;
};

type BadgeProps = {
  text: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
};

type TextProps = {
  text: string;
  variant?: "body" | "lead" | "muted" | "caption" | "code";
};

const textVariantClasses: Record<NonNullable<TextProps["variant"]>, string> = {
  body: "text-sm leading-6 text-foreground",
  lead: "text-sm leading-6 text-muted-foreground",
  muted: "text-sm leading-5 text-muted-foreground",
  caption: "text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground",
  code: "rounded-none bg-muted px-2.5 py-2 font-mono text-[12px] leading-5 text-foreground",
};

const panelToneClasses = {
  default: "bg-card",
  accent: "bg-accent/35",
  muted: "bg-muted/60",
} as const;

export const { registry: copilotRegistry } = defineRegistry(copilotCatalog, {
  components: {
    Stack: shadcnComponents.Stack,
    Card: shadcnComponents.Card,
    Heading: shadcnComponents.Heading,
    Text: ({ props }: BaseComponentProps<TextProps>) => (
      <p
        className={cn(
          "min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]",
          textVariantClasses[props.variant ?? "body"],
        )}
      >
        {props.text}
      </p>
    ),
    Badge: ({ props }: BaseComponentProps<BadgeProps>) => (
      <UIBadge variant={props.variant ?? "outline"}>{props.text}</UIBadge>
    ),
    Separator: shadcnComponents.Separator,
    Alert: shadcnComponents.Alert,
    Panel: ({ props, children }: BaseComponentProps<PanelProps>) => (
      <Card
        size={props.size === "compact" ? "sm" : "default"}
        data-testid={props.testId ?? undefined}
        className={cn(
          "w-full min-w-0 overflow-hidden rounded-none shadow-none",
          panelToneClasses[props.tone ?? "default"],
        )}
      >
        {(props.eyebrow ?? props.title) && (
          <CardHeader className="gap-1 pb-3">
            {props.eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {props.eyebrow}
              </p>
            )}
            {props.title && (
              <CardTitle className="text-base font-semibold tracking-[-0.02em] text-foreground">
                {props.title}
              </CardTitle>
            )}
          </CardHeader>
        )}
        <CardContent className="flex min-w-0 flex-col gap-3 pt-0 [&_p]:break-words [&_p]:[overflow-wrap:anywhere] [&_span]:break-words [&_span]:[overflow-wrap:anywhere]">
          {children}
        </CardContent>
      </Card>
    ),
    MarkdownAnswer: ({ props }: BaseComponentProps<MarkdownAnswerProps>) => (
      <div
        data-testid={props.testId ?? undefined}
        className="prose prose-sm max-w-none break-words text-foreground prose-headings:tracking-[-0.02em] prose-p:my-0 prose-p:text-sm prose-p:leading-6 prose-li:text-sm prose-li:leading-6 prose-table:text-sm [&_:not(pre)>code]:rounded-none [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-sans [&_:not(pre)>code]:text-[0.95em] [&_:not(pre)>code]:font-medium [&_:not(pre)>code]:text-foreground [&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none"
      >
        <Streamdown>{props.content}</Streamdown>
      </div>
    ),
  },
});
