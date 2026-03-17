import type { Confidence } from "@/client/types.ts"
import { Badge } from "@/components/ui/badge.tsx"

const colors: Record<Confidence, string> = {
  high: "bg-green-500/15 text-green-700 border-green-500/25",
  medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/25",
  low: "bg-red-500/15 text-red-700 border-red-500/25",
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <Badge
      variant="outline"
      className={colors[confidence]}
      data-testid="confidence-badge"
    >
      {confidence}
    </Badge>
  )
}
