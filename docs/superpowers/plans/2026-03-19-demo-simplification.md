# Demo Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the codebase from 16 runtime dependencies to 7, eliminate ~500 lines of abstraction overhead, and simplify state management — making the demo readable in 10 minutes.

**Architecture:** Replace the json-render spec pipeline with plain React components. Flatten the turns array to a single turn. Replace Base UI + CVA component wrappers with raw HTML + Tailwind. Consolidate icon libraries. Trim the E2E suite from 35 to ~22 tests.

**Tech Stack:** React 19, Tailwind v4, SignalR (`@microsoft/signalr`), Streamdown, Playwright

---

## File Map

### Files to DELETE (9 files)

| File | Lines | Why |
|------|-------|-----|
| `src/render/catalog.ts` | 35 | json-render catalog — no longer needed |
| `src/render/registry.tsx` | 103 | json-render registry — replaced by direct components |
| `src/render/json-render-view.tsx` | 36 | json-render bridge — no longer needed |
| `src/render/spec-builders.ts` | 140 | spec builder functions — replaced by React components |
| `src/render/types.ts` | 13 | RenderTreeNode type — no longer needed |
| `src/components/ui/card.tsx` | 56 | Card wrappers — inlined into Panel component and plain divs |
| `src/components/ui/textarea.tsx` | 18 | Wrapper around `<textarea>` — inline the element |
| `src/components/agent-badge.tsx` | 10 | Trivial wrapper — inline into App |
| `src/components/confidence-badge.tsx` | 10 | Trivial wrapper — inline into App |

### Files to CREATE (1 file)

| File | Purpose |
|------|---------|
| `src/components/copilot-views.tsx` | All 7 view components + shared Panel/Text/MarkdownAnswer primitives |

### Files to MODIFY (9 files)

| File | Changes |
|------|---------|
| `src/components/ui/badge.tsx` | Rewrite: remove Base UI/CVA, use plain `<span>` + lookup |
| `src/components/ui/button.tsx` | Rewrite: remove Base UI/CVA, use plain `<button>` + lookup |
| `src/client/use-copilot.ts` | Flatten `turns[]` → single `turn`, remove 3 reconnect refs |
| `src/client/App.tsx` | Use new view components, remove json-render imports, remove 7 useMemos |
| `src/components/ui/dialog.tsx` | Replace `@base-ui/react/dialog` with native `<dialog>`, drop Hugeicons |
| `src/lib/utils.ts` | Drop `tailwind-merge`, simplify `cn()` to just `clsx()` |
| `src/index.css` | Remove `@fontsource-variable/geist` import (optional) |
| `package.json` | Remove 9 dependencies |
| `e2e/*.spec.ts` | Delete pixel-geometry tests, remove redundant tests |

---

### Task 1: Remove Hugeicons, consolidate to lucide-react

**Files:**
- Modify: `src/components/ui/dialog.tsx:1-7,59`
- Modify: `package.json` (remove `@hugeicons/core-free-icons`, `@hugeicons/react`)

- [ ] **Step 1: Replace Hugeicons import with lucide in dialog.tsx**

Replace the imports at lines 6-7:
```tsx
// Remove these:
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

// Add this:
import { X } from "lucide-react";
```

Replace line 59:
```tsx
// Before:
<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />

// After:
<X />
```

- [ ] **Step 2: Remove Hugeicons packages**

Run: `npm uninstall @hugeicons/react @hugeicons/core-free-icons`

- [ ] **Step 3: Verify build**

Run: `npx vp check`
Expected: PASS — no warnings or lint errors

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/dialog.tsx package.json package-lock.json
git commit -m "refactor: consolidate icon libraries — drop Hugeicons, use lucide X"
```

---

### Task 2: Drop tailwind-merge, simplify cn()

**Files:**
- Modify: `src/lib/utils.ts`
- Modify: `package.json` (remove `tailwind-merge`)

- [ ] **Step 1: Simplify cn() to use clsx only**

Replace `src/lib/utils.ts` entirely:
```ts
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
```

- [ ] **Step 2: Remove tailwind-merge**

Run: `npm uninstall tailwind-merge`

- [ ] **Step 3: Verify build**

Run: `npx vp check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils.ts package.json package-lock.json
git commit -m "refactor: drop tailwind-merge, simplify cn() to clsx"
```

---

### Task 3: Replace Base UI Button with plain `<button>`

**Files:**
- Rewrite: `src/components/ui/button.tsx`
- Modify: `package.json` (remove `class-variance-authority` — done after badge too)

- [ ] **Step 1: Rewrite button.tsx without Base UI or CVA**

Only 4 variants × 4 sizes are actually used in this app. Replace `src/components/ui/button.tsx`:

```tsx
import { cn } from "@/lib/utils";

const variantClasses = {
  default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
  outline:
    "border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost:
    "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
} as const;

const sizeClasses = {
  sm: "h-7 gap-1 px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
  lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
  "icon-sm": "size-7",
} as const;

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
};

export function Button({
  className,
  variant = "default",
  size = "sm",
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(
        "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx vp check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "refactor: replace Base UI Button with plain <button> + lookup tables"
```

---

### Task 4: Replace Base UI Badge with plain `<span>`

**Files:**
- Rewrite: `src/components/ui/badge.tsx`

- [ ] **Step 1: Rewrite badge.tsx without Base UI, useRender, mergeProps, or CVA**

Only `outline` and `secondary` variants are used. Replace `src/components/ui/badge.tsx`:

```tsx
import { cn } from "@/lib/utils";

const variantClasses = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border-border text-foreground",
} as const;

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: keyof typeof variantClasses;
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Remove CVA (keep @base-ui/react — dialog.tsx still needs it until Task 5)**

Run: `npm uninstall class-variance-authority`

- [ ] **Step 3: Verify build**

Run: `npx vp check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/badge.tsx package.json package-lock.json
git commit -m "refactor: replace Base UI Badge with plain <span>"
```

---

### Task 5: Replace Base UI Dialog with native `<dialog>`

**Files:**
- Rewrite: `src/components/ui/dialog.tsx`

- [ ] **Step 1: Rewrite dialog.tsx using native `<dialog>` element**

The app uses only `side="right"` with `showCloseButton={false}`. Replace `src/components/ui/dialog.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-slot="dialog"
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      className="fixed inset-0 z-50 m-0 h-dvh w-dvw bg-transparent p-0 backdrop:bg-black/10 backdrop:backdrop-blur-xs open:flex open:items-stretch open:justify-end"
    >
      {open && children}
    </dialog>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean; side?: string }) {
  const { showCloseButton: _, side: __, ...rest } = props;
  return (
    <div
      data-slot="dialog-content"
      className={cn(
        "z-50 h-screen w-full max-w-full gap-4 rounded-none bg-background p-4 text-xs/relaxed ring-1 ring-foreground/10 outline-none sm:my-3 sm:mr-3 sm:h-[calc(100dvh-1.5rem)] sm:w-[25rem] sm:max-w-[calc(100vw-1.5rem)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn(
        "text-xs/relaxed text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Now remove @base-ui/react if not already removed in Task 4**

Run: `npm uninstall @base-ui/react 2>/dev/null; echo done`

- [ ] **Step 3: Verify build**

Run: `npx vp check`
Expected: PASS

- [ ] **Step 4: Run E2E tests that exercise the inspector dialog**

Run: `npx playwright test e2e/post-response.spec.ts`
Expected: All tests pass — inspector opens/closes, reasoning/citations/tools visible

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/dialog.tsx package.json package-lock.json
git commit -m "refactor: replace Base UI Dialog with native <dialog> element"
```

---

### Task 6: Delete Textarea wrapper, inline into App

**Files:**
- Delete: `src/components/ui/textarea.tsx`
- Modify: `src/client/App.tsx` (the single import + usage of `<Textarea>`)

- [ ] **Step 1: Replace Textarea import and usage in App.tsx**

In `src/client/App.tsx`, remove the import:
```tsx
// Remove:
import { Textarea } from "@/components/ui/textarea.tsx";
```

Replace `<Textarea` at line ~185 with a plain `<textarea`:
```tsx
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
```

- [ ] **Step 2: Delete the wrapper file**

```bash
rm src/components/ui/textarea.tsx
```

- [ ] **Step 3: Verify build**

Run: `npx vp check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: inline <textarea>, delete Textarea wrapper"
```

---

### Task 7: Flatten useCopilot state — single turn instead of array

**Files:**
- Rewrite: `src/client/use-copilot.ts`

- [ ] **Step 1: Rewrite use-copilot.ts with flat state**

Replace `src/client/use-copilot.ts` entirely:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  HubConnectionBuilder,
  HubConnectionState,
  type HubConnection,
  type ISubscription,
} from "@microsoft/signalr";
import type { CopilotTurn, CopilotState, ServerEvent } from "./types.ts";

interface CopilotResult {
  turn: CopilotTurn | null;
  state: CopilotState;
  error: string | null;
  isPending: boolean;
  isStreaming: boolean;
  isBusy: boolean;
  send: (query: string) => void;
  reset: () => void;
}

function buildConnection(): HubConnection {
  return new HubConnectionBuilder().withUrl("/hubs/copilot").withAutomaticReconnect().build();
}

export function useCopilot(): CopilotResult {
  const [turn, setTurn] = useState<CopilotTurn | null>(null);
  const threadIdRef = useRef(crypto.randomUUID());
  const connRef = useRef<HubConnection | null>(null);
  const subRef = useRef<ISubscription<ServerEvent> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const conn = buildConnection();
    connRef.current = conn;
    conn.start().catch((err) => console.error("SignalR connect failed:", err));
    return () => {
      subRef.current?.dispose();
      conn.stop();
    };
  }, []);

  const reset = useCallback(() => {
    subRef.current?.dispose();
    subRef.current = null;
    cancelledRef.current = true;
    setTurn(null);
    threadIdRef.current = crypto.randomUUID();
  }, []);

  const send = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    subRef.current?.dispose();
    subRef.current = null;
    cancelledRef.current = false;

    setTurn({
      id: crypto.randomUUID(),
      query: trimmed,
      state: "pending",
      response: null,
      error: null,
      partialAnswer: null,
    });

    const update = (patch: Partial<CopilotTurn>) => {
      if (cancelledRef.current) return;
      setTurn((prev) => (prev ? { ...prev, ...patch } : prev));
    };

    (async () => {
      try {
        const conn = connRef.current;
        if (!conn) throw new Error("SignalR connection not initialised");

        // Simplified reconnect: only handle Disconnected → start().
        // If mid-reconnect (Reconnecting/Connecting), the stream() call
        // will throw and the catch block shows an error. This is acceptable
        // for a demo — the previous 3-ref reconnect-await pattern was
        // production-correct but added cognitive overhead.
        if (conn.state === HubConnectionState.Disconnected) {
          await conn.start();
        }

        const subject = conn.stream<ServerEvent>("StreamQuery", {
          query: trimmed,
          threadId: threadIdRef.current,
        });

        subRef.current = subject.subscribe({
          next(msg) {
            if (cancelledRef.current) return;
            switch (msg.type) {
              case "delta":
                setTurn((prev) =>
                  prev
                    ? { ...prev, state: "streaming", partialAnswer: (prev.partialAnswer ?? "") + msg.content }
                    : prev,
                );
                break;
              case "done":
                update({ state: "done", response: msg.response, error: null, partialAnswer: null });
                break;
              case "error":
                update({ state: "error", response: null, error: msg.message, partialAnswer: null });
                break;
            }
          },
          error(err) {
            if (cancelledRef.current) return;
            const message = err instanceof Error ? err.message : String(err);
            update({ state: "error", response: null, error: message, partialAnswer: null });
          },
          complete() {
            if (cancelledRef.current) return;
            setTurn((prev) => {
              if (!prev || prev.state === "done" || prev.state === "error") return prev;
              return { ...prev, state: "error", error: "Stream closed without a final response.", partialAnswer: null };
            });
          },
        });
      } catch (err: unknown) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        update({ state: "error", response: null, error: message, partialAnswer: null });
      }
    })();
  }, []);

  const state: CopilotState = turn?.state ?? "idle";
  const isPending = state === "pending";
  const isStreaming = state === "streaming";
  const isBusy = isPending || isStreaming;
  const error = turn?.error ?? null;

  return { turn, state, error, isPending, isStreaming, isBusy, send, reset };
}
```

- [ ] **Step 2: Update App.tsx to use `turn` instead of `latestTurn`**

In `src/client/App.tsx`, change the destructuring:
```tsx
// Before:
const { latestTurn, state, error, isPending, isStreaming, isBusy, send, reset } = useCopilot();
// ...
const response = latestTurn?.response ?? null;
const query = latestTurn?.query ?? null;
const partialAnswer = latestTurn?.partialAnswer ?? null;

// After:
const { turn, state, error, isPending, isStreaming, isBusy, send, reset } = useCopilot();
// ...
const response = turn?.response ?? null;
const query = turn?.query ?? null;
const partialAnswer = turn?.partialAnswer ?? null;
```

- [ ] **Step 3: Verify build**

Run: `npx vp check`
Expected: PASS

- [ ] **Step 4: Run core E2E tests**

Run: `npx playwright test e2e/copilot.spec.ts e2e/ws-copilot.spec.ts`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/client/use-copilot.ts src/client/App.tsx
git commit -m "refactor: flatten useCopilot — single turn state replaces turns array"
```

---

### Task 8: Replace json-render pipeline with plain React components

This is the biggest task. It replaces `src/render/` (5 files, 327 lines) with one file of direct React components.

**Files:**
- Create: `src/components/copilot-views.tsx`
- Delete: `src/render/catalog.ts`, `src/render/registry.tsx`, `src/render/json-render-view.tsx`, `src/render/spec-builders.ts`, `src/render/types.ts`
- Modify: `src/client/App.tsx` — replace all spec-builder + JsonRenderView usage

- [ ] **Step 1: Create src/components/copilot-views.tsx**

This file contains all 7 view components plus the shared primitives (Panel, Text, MarkdownAnswer). The component implementations are lifted directly from `registry.tsx` and `spec-builders.ts`:

```tsx
import { Streamdown } from "streamdown";
import type { AgentResponse } from "@/client/types.ts";
import type { Workflow } from "@/client/scenarios.ts";
import { cn } from "@/lib/utils.ts";
import { Badge } from "@/components/ui/badge.tsx";

// -- Shared primitives --

const textVariantClasses = {
  body: "text-sm leading-6 text-foreground",
  lead: "text-sm leading-6 text-muted-foreground",
  muted: "text-sm leading-5 text-muted-foreground",
  caption: "text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground",
  code: "rounded-none bg-muted px-2.5 py-2 font-mono text-[12px] leading-5 text-foreground",
} as const;

function Text({ text, variant = "body" }: { text: string; variant?: keyof typeof textVariantClasses }) {
  return (
    <p className={cn("min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]", textVariantClasses[variant])}>
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
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>}
          {title && <div className="text-base font-semibold tracking-[-0.02em] text-foreground">{title}</div>}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-3 px-4 [&_p]:break-words [&_p]:[overflow-wrap:anywhere]">{children}</div>
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

// -- View components --

export function IdleView({ workflowCount }: { workflowCount: number }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight">Ask the data</h2>
      <Text text={`Pick a lane or type below. ${workflowCount} lanes stay available while the center stays focused on the active chat.`} variant="lead" />
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
      <Text text={`Answered by the ${response.agentUsed} agent with ${response.confidence} confidence.`} variant="muted" />
      <MarkdownAnswer content={response.answer} />
    </Panel>
  );
}

export function WorkflowBriefView({ workflow }: { workflow: Workflow }) {
  if (workflow.gaps.length === 0) return null;
  return (
    <Panel title="Known limits" eyebrow={workflow.label} testId="workflow-brief" compact>
      <div className="flex flex-col gap-2">
        {workflow.gaps.map((gap, i) => <Text key={i} text={gap} />)}
      </div>
    </Panel>
  );
}

export function InspectorView({ response }: { response: AgentResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Tools" eyebrow="Execution" testId="tools-used">
        <div className="flex flex-col gap-2">
          {response.toolsUsed.length > 0
            ? response.toolsUsed.map((tool, i) => <Text key={i} text={tool} />)
            : <Text text="No tools were recorded for this answer." variant="muted" />}
        </div>
      </Panel>
      <Panel title="Reasoning" eyebrow="Trace" testId="reasoning">
        <div className="flex flex-col gap-2">
          {response.reasoning.length > 0
            ? response.reasoning.map((step, i) => <Text key={i} text={`${i + 1}. ${step}`} />)
            : <Text text="No reasoning trace was returned." variant="muted" />}
        </div>
      </Panel>
      <Panel title={`Citations (${response.citations.length})`} eyebrow="Sources" testId="citations">
        <div className="flex flex-col gap-2">
          {response.citations.length > 0
            ? response.citations.map((c, i) => <Text key={i} text={`${c.resourceType}/${c.id}`} />)
            : <Text text="No citations were returned for this answer." variant="muted" />}
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
```

- [ ] **Step 2: Rewrite App.tsx to use the new view components**

In `src/client/App.tsx`:

Remove all json-render imports:
```tsx
// Remove:
import { JsonRenderView } from "@/render/json-render-view.tsx";
import {
  buildCompletedSpec, buildErrorSpec, buildIdleSpec, buildInspectorSpec,
  buildPendingSpec, buildStreamingSpec, buildWorkflowBriefSpec,
} from "@/render/spec-builders.ts";
```

Add new imports:
```tsx
import {
  IdleView, PendingView, StreamingView, CompletedView,
  WorkflowBriefView, InspectorView, ErrorView,
} from "@/components/copilot-views.tsx";
```

Remove the `AgentBadge` and `ConfidenceBadge` imports (inline them or use the ones from copilot-views).

Remove all 7 spec useMemo calls and replace the JSX:

```tsx
// Idle:
// Before: <JsonRenderView tree={idleSpec} />
// After:
<IdleView workflowCount={workflows.length} />

// Pending:
// Before: <JsonRenderView tree={pendingSpec} />
// After:
<PendingView query={query} />

// Streaming:
// Before: <JsonRenderView tree={streamingSpec} />
// After:
<StreamingView content={partialAnswer} />

// Error:
// Before: <JsonRenderView tree={buildErrorSpec(error)} />
// After:
<ErrorView message={error} />

// Completed:
// Before: <JsonRenderView tree={completedSpec} />
// After:
<CompletedView response={response} />

// Workflow brief:
// Before: <JsonRenderView tree={workflowBriefSpec} />
// After:
<WorkflowBriefView workflow={activeWorkflow} />

// Inspector:
// Before: <JsonRenderView tree={inspectorSpec} />
// After:
<InspectorView response={response} />
```

Also inline the AgentBadge/ConfidenceBadge — replace:
```tsx
<AgentBadge agent={response.agentUsed} />
<ConfidenceBadge confidence={response.confidence} />
```
with:
```tsx
<Badge variant="outline" data-testid="agent-badge" data-agent={response.agentUsed}>{response.agentUsed}</Badge>
<Badge variant="outline" data-testid="confidence-badge">{response.confidence}</Badge>
```

Also replace the `Card`/`CardContent` usage in the inspector's "Session memory" block (~lines 268-275) with a plain `<div>`:
```tsx
// Before:
import { Card, CardContent } from "@/components/ui/card.tsx";
// ...
<Card className="rounded-none bg-muted/40 shadow-none">
  <CardContent className="...">...</CardContent>
</Card>

// After (remove the Card import, replace with):
<div className="flex flex-col gap-2 rounded-none bg-muted/40 px-4 py-4 text-sm leading-6 text-muted-foreground ring-1 ring-foreground/10">
  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
    Session memory
  </p>
  <p>Follow-up questions keep the same thread until you clear the session.</p>
</div>
```

- [ ] **Step 3: Delete the entire src/render/ directory and wrapper components**

```bash
rm -rf src/render/
rm src/components/agent-badge.tsx src/components/confidence-badge.tsx
```

- [ ] **Step 4: Remove json-render and zod packages**

Run: `npm uninstall @json-render/core @json-render/react @json-render/shadcn zod`

- [ ] **Step 5: Verify build**

Run: `npx vp check`
Expected: PASS

- [ ] **Step 6: Run full E2E suite**

Run: `npx playwright test`
Expected: All tests pass — the rendered output has the same data-testid attributes and content

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: replace json-render pipeline with plain React components

Remove @json-render/core, @json-render/react, @json-render/shadcn, zod.
Delete src/render/ (5 files, 327 lines).
Replace with src/components/copilot-views.tsx (~150 lines).
Inline AgentBadge and ConfidenceBadge into App.tsx."
```

---

### Task 9: Delete Card wrapper (now unused after json-render removal)

**Files:**
- Delete: `src/components/ui/card.tsx` (if no longer imported anywhere)

- [ ] **Step 1: Verify card.tsx is not imported**

Run: `grep -r "card.tsx\|from.*card" src/ --include='*.tsx' --include='*.ts'`
Expected: No matches (the Panel component in copilot-views.tsx uses plain `<div>` instead)

If still imported somewhere, update that import first.

- [ ] **Step 2: Delete card.tsx**

```bash
rm src/components/ui/card.tsx
```

- [ ] **Step 3: Verify build**

Run: `npx vp check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete unused Card wrapper"
```

---

### Task 10: Trim E2E test suite — remove pixel/geometry tests and redundant tests

**Files:**
- Modify: `e2e/copilot.spec.ts` — remove 4 layout bounding-box tests
- Modify: `e2e/sidebar.spec.ts` — remove 3 pixel-position tests
- Modify: `e2e/post-response.spec.ts` — remove badge-radius and inspector-bounds tests
- Modify: `e2e/input-validation.spec.ts` — remove CSS color token test
- Delete: `e2e/reset-flow.spec.ts` — fully covered by ws-copilot.spec.ts

- [ ] **Step 1: In copilot.spec.ts, delete these 4 tests:**

- "desktop layout gives the chat canvas more width" (bounding box assertion)
- "small screens keep the composer reachable without horizontal page scroll" (bounding box + scroll)
- "desktop composer stays compact instead of becoming a tall panel" (height assertion)
- "desktop layout keeps the workflow rail compact so the chat stage stays wide" (rail/stage widths)

Keep: page load, 6 agent routing, custom query, pending behavior.

- [ ] **Step 2: In sidebar.spec.ts, delete these 3 tests:**

- "workflow header controls stay inside the sidebar rail" (chip bounding box)
- "collapsed workflow rows stay compact in the rail" (card height ≤76)
- "workflow action chips keep a stable anchor point across cards" (chip offset delta ≤6)

Keep: expand/collapse, scenario sends query, workflow limits, sidebar disabled during pending, partial badges.

- [ ] **Step 3: In post-response.spec.ts, delete these 2 tests:**

- "response badges and inline code use the shell styling system" (badge border-radius assertion)
- "inspector drawer stays inside the viewport with long detail payloads" (bounding box)

Keep: reasoning panel toggle, citations toggle, inspector open/close round-trip.

- [ ] **Step 4: In input-validation.spec.ts, delete this 1 test:**

- "primary action uses the adapted preset brand color" (CSS variable color comparison)

Keep: disabled when empty, disabled with whitespace, enabled with valid input, Enter submits, input clears.

- [ ] **Step 5: Delete reset-flow.spec.ts entirely**

Both tests are substantially covered by `ws-copilot.spec.ts` ("reset returns to idle from any in-flight state" and "thread ID preserved across requests — reset generates a new one"). The ws-copilot versions exercise the same lifecycle but with slightly different assertions.

```bash
rm e2e/reset-flow.spec.ts
```

- [ ] **Step 6: Verify remaining tests pass**

Run: `npx playwright test`
Expected: All remaining tests pass. Count should be ~22-25 (down from 35).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: trim E2E suite — remove pixel-geometry and redundant tests

Remove 10 cosmetic tests (bounding boxes, pixel positions, CSS variables).
Delete reset-flow.spec.ts (covered by ws-copilot.spec.ts).
Remaining suite: ~22 behavioral tests."
```

---

### Task 11: Remove @fontsource-variable/geist (optional cosmetic dependency)

**Files:**
- Modify: `src/index.css`
- Modify: `package.json`

- [ ] **Step 1: Remove the font import from index.css**

In `src/index.css`, delete:
```css
@import "@fontsource-variable/geist";
```

In the `@theme inline` block, change:
```css
--font-sans: "Geist Variable", sans-serif;
```
to:
```css
--font-sans: system-ui, sans-serif;
```

- [ ] **Step 2: Remove the package**

Run: `npm uninstall @fontsource-variable/geist`

- [ ] **Step 3: Verify build**

Run: `npx vp check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/index.css package.json package-lock.json
git commit -m "refactor: drop Geist font, use system sans-serif"
```

---

### Task 12: Final cleanup and verification

- [ ] **Step 1: Verify no dead imports remain**

Run: `npx vp check`
Expected: PASS

- [ ] **Step 2: Run full E2E suite**

Run: `npx playwright test`
Expected: All remaining tests pass

- [ ] **Step 3: Count final stats**

Run:
```bash
echo "=== Dependencies ==="
cat package.json | grep -c '"@\|"[a-z]' | head -1
echo "=== Source lines ==="
find src -name '*.ts' -o -name '*.tsx' | xargs wc -l | tail -1
echo "=== Test count ==="
grep -r "test(" e2e/ --include='*.spec.ts' | wc -l
echo "=== Source files ==="
find src -name '*.ts' -o -name '*.tsx' | wc -l
```

Expected roughly:
- Runtime deps: ~7 (was 17)
- Source lines: ~800 (was ~1450 .ts/.tsx)
- Tests: ~22 (was 35)
- Source files: ~10 (was 20)

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final cleanup after demo simplification"
```

---

## Summary of Removals

| Package | Why removed |
|---------|-------------|
| `@json-render/core` | Replaced by direct React components |
| `@json-render/react` | Replaced by direct React components |
| `@json-render/shadcn` | Replaced by direct React components |
| `zod` | Only used by json-render catalog |
| `@base-ui/react` | Replaced by native HTML elements |
| `class-variance-authority` | Replaced by plain lookup objects |
| `@hugeicons/react` | Consolidated to lucide-react |
| `@hugeicons/core-free-icons` | Consolidated to lucide-react |
| `tailwind-merge` | Unnecessary for demo — clsx suffices |
| `@fontsource-variable/geist` | Cosmetic — system font works |
