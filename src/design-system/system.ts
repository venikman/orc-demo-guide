export const surfaceClasses = {
  elevatedPanel: "bg-card shadow-none",
  rail: "bg-[color:var(--surface-rail)]",
  header: "bg-[color:var(--surface-app)]",
  queryBubble: "border-border bg-card text-foreground shadow-none",
} as const

export const panelToneClasses = {
  default: "bg-card",
  accent: "bg-card",
  muted: "bg-muted/40",
} as const

export const workflowLaneDotClasses = {
  "care-gaps": "bg-[color:var(--lane-care-gaps)]",
  quality: "bg-[color:var(--lane-quality)]",
  utilization: "bg-[color:var(--lane-utilization)]",
  membership: "bg-[color:var(--lane-membership)]",
  clinical: "bg-[color:var(--lane-clinical)]",
  reconciliation: "bg-[color:var(--lane-reconciliation)]",
} as const

export const workflowRailClasses = {
  card: "border border-border/70 bg-card shadow-none",
  cardOpen: "border-[color:var(--brand-100)] bg-card",
  actionChip:
    "border border-border/70 bg-background text-muted-foreground transition-colors group-hover:bg-muted",
  partialBadge:
    "border border-[color:var(--warning-200)]/70 bg-[color:var(--warning-50)] text-[color:var(--warning-700)]",
  promptRow:
    "border border-transparent bg-muted/45 text-foreground transition-colors hover:border-border/70 hover:bg-secondary",
} as const
