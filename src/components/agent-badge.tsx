import type { AgentType } from "@/client/types.ts"
import { Badge } from "@/components/ui/badge.tsx"

export function AgentBadge({ agent }: { agent: AgentType }) {
  return (
    <Badge variant="outline" data-testid="agent-badge" data-agent={agent}>
      {agent}
    </Badge>
  )
}
