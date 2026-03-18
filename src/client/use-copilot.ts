import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  CopilotRequest,
  CopilotTurn,
  CopilotState,
} from "./types.ts"

interface CopilotResult {
  latestTurn: CopilotTurn | null
  state: CopilotState
  error: string | null
  isPending: boolean
  send: (query: string) => void
  reset: () => void
}

const COPILOT_URL = import.meta.env.VITE_API_URL
  ? new URL("/api/copilot", import.meta.env.VITE_API_URL).toString()
  : "/api/copilot"

export function useCopilot(): CopilotResult {
  const [turns, setTurns] = useState<CopilotTurn[]>([])
  const threadIdRef = useRef<string>(crypto.randomUUID())
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setTurns([])
    threadIdRef.current = crypto.randomUUID()
  }, [])

  const send = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return

    abortRef.current?.abort()

    const controller = new AbortController()
    abortRef.current = controller

    const turnId = crypto.randomUUID()
    setTurns((prev) => [
      ...prev,
      {
        id: turnId,
        query: trimmed,
        state: "pending",
        response: null,
        error: null,
      },
    ])

    const run = async () => {
      const payload: CopilotRequest = {
        query: trimmed,
        threadId: threadIdRef.current,
      }

      try {
        const result = await fetch(COPILOT_URL, {
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        })

        if (!result.ok) {
          throw new Error(`Request failed with status ${result.status}`)
        }

        const response = await result.json()

        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === turnId
              ? {
                  ...turn,
                  state: "done",
                  response,
                  error: null,
                }
              : turn,
          ),
        )
      } catch (error) {
        if (controller.signal.aborted) return

        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === turnId
              ? {
                  ...turn,
                  state: "error",
                  response: null,
                  error:
                    error instanceof Error ? error.message : "The request could not be completed.",
                }
              : turn,
          ),
        )
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    }

    void run()
  }, [])

  const latestTurn = useMemo(() => turns.at(-1) ?? null, [turns])
  const state = latestTurn?.state ?? "idle"
  const isPending = state === "pending"
  const error = latestTurn?.error ?? null

  return { latestTurn, state, error, isPending, send, reset }
}
