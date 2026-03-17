import type { AgentType } from "@/client/types.ts"
import { Badge } from "@/components/ui/badge.tsx"

const agentColors: Record<AgentType, string> = {
  lookup: "bg-blue-500/15 text-blue-700 border-blue-500/25",
  search: "bg-green-500/15 text-green-700 border-green-500/25",
  analytics: "bg-purple-500/15 text-purple-700 border-purple-500/25",
  clinical: "bg-orange-500/15 text-orange-700 border-orange-500/25",
  cohort: "bg-red-500/15 text-red-700 border-red-500/25",
  export: "bg-teal-500/15 text-teal-700 border-teal-500/25",
}

export function AgentBadge({ agent }: { agent: AgentType }) {
  return (
    <Badge
      variant="outline"
      className={agentColors[agent]}
      data-testid="agent-badge"
      data-agent={agent}
    >
      {agent}
    </Badge>
  )
}
