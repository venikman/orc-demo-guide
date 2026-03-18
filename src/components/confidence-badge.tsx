import type { Confidence } from "@/client/types.ts"
import { Badge } from "@/components/ui/badge.tsx"

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <Badge variant="outline" data-testid="confidence-badge">
      {confidence}
    </Badge>
  )
}
