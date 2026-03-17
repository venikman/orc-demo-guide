import { useMemo, useState } from "react"
import type { Citation } from "@/client/types.ts"
import { Badge } from "@/components/ui/badge.tsx"
import { ChevronRight } from "lucide-react"

export function CitationsList({ citations }: { citations: Citation[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const c of citations) {
      const ids = map.get(c.resourceType) ?? []
      ids.push(c.id)
      map.set(c.resourceType, ids)
    }
    return map
  }, [citations])

  if (citations.length === 0) return null

  return (
    <div data-testid="citations" className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Citations ({citations.length})
      </h4>
      <div className="space-y-1">
        {[...grouped.entries()].map(([type, ids]) => (
          <div key={type}>
            <button
              type="button"
              onClick={() => setExpanded(expanded === type ? null : type)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted transition-colors"
            >
              <ChevronRight
                className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${expanded === type ? "rotate-90" : ""}`}
              />
              <span className="font-medium">{type}</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {ids.length}
              </Badge>
            </button>
            {expanded === type && (
              <div className="ml-6 mt-1 flex flex-wrap gap-1 pb-1">
                {ids.map((id) => (
                  <Badge key={id} variant="outline" className="text-[11px] font-mono">
                    {id}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
