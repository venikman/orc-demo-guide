import { useCallback, useEffect, useRef, useState } from "react"
import type {
  AgentResponse,
  AgentType,
  CopilotState,
  WsClientMessage,
  WsServerMessage,
} from "./types.ts"

interface ToolCall {
  name: string
  preview?: string
  timestamp: number
}

interface CopilotResult {
  state: CopilotState
  query: string | null
  content: string
  agentType: AgentType | null
  toolCalls: ToolCall[]
  response: AgentResponse | null
  error: string | null
  send: (query: string) => void
  reset: () => void
}

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3000/api/copilot/ws"

export function useCopilot(): CopilotResult {
  const [state, setState] = useState<CopilotState>("idle")
  const [query, setQuery] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [agentType, setAgentType] = useState<AgentType | null>(null)
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])
  const [response, setResponse] = useState<AgentResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const threadIdRef = useRef<string>(crypto.randomUUID())

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setState("idle")
    setQuery(null)
    setContent("")
    setAgentType(null)
    setToolCalls([])
    setResponse(null)
    setError(null)
    threadIdRef.current = crypto.randomUUID()
  }, [])

  const send = useCallback((query: string) => {
    // Reset previous state
    setQuery(query)
    setContent("")
    setAgentType(null)
    setToolCalls([])
    setResponse(null)
    setError(null)
    setState("connecting")

    const openAndSend = (ws: WebSocket) => {
      const msg: WsClientMessage = {
        type: "query",
        query,
        threadId: threadIdRef.current,
      }
      try {
        ws.send(JSON.stringify(msg))
        setState("streaming")
      } catch {
        setError("Failed to send message")
        setState("error")
      }
    }

    // Reuse existing open connection
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      openAndSend(wsRef.current)
      return
    }

    // Close stale connection — clear handlers first to prevent the old
    // onclose from nulling wsRef after we assign the new socket below
    if (wsRef.current) {
      const old = wsRef.current
      old.onopen = null
      old.onmessage = null
      old.onerror = null
      old.onclose = null
      old.close()
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => openAndSend(ws)

    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data as string) as WsServerMessage
      switch (msg.type) {
        case "meta":
          setAgentType(msg.agentType)
          break
        case "delta":
          setContent((prev) => prev + msg.content)
          break
        case "tool":
          setToolCalls((prev) => [
            ...prev,
            { name: msg.name, preview: msg.preview, timestamp: Date.now() },
          ])
          break
        case "done":
          setResponse(msg.response)
          setState("done")
          break
        case "error":
          setError(msg.message)
          setState("error")
          break
      }
    }

    ws.onerror = () => {
      setError("WebSocket connection failed")
      setState("error")
    }

    ws.onclose = (e) => {
      if (e.code !== 1000 && e.code !== 1005) {
        setError(`Connection closed: ${e.reason || "unexpected"}`)
        setState("error")
      }
      // Only null the ref if this is still the active socket
      if (wsRef.current === ws) {
        wsRef.current = null
      }
    }
  }, [])

  return { state, query, content, agentType, toolCalls, response, error, send, reset }
}
