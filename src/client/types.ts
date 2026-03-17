export type AgentType =
  | "lookup"
  | "search"
  | "analytics"
  | "clinical"
  | "cohort"
  | "export"

export type Confidence = "high" | "medium" | "low"

export interface Citation {
  resourceType: string
  id: string
}

export interface AgentResponse {
  answer: string
  citations: Citation[]
  reasoning: string[]
  toolsUsed: string[]
  agentUsed: AgentType
  confidence: Confidence
}

// WebSocket messages: server → client
export type WsServerMessage =
  | { type: "meta"; agentType: AgentType; threadId: string }
  | { type: "delta"; content: string }
  | { type: "tool"; name: string; preview?: string }
  | { type: "done"; response: AgentResponse }
  | { type: "error"; message: string }

// WebSocket messages: client → server
export interface WsClientMessage {
  type: "query"
  query: string
  threadId?: string
}

export type CopilotState = "idle" | "connecting" | "streaming" | "done" | "error"
