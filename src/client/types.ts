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

export interface CopilotRequest {
  query: string
  threadId?: string
}

export type CopilotState = "idle" | "pending" | "done" | "error"

export interface CopilotTurn {
  id: string
  query: string
  state: Exclude<CopilotState, "idle">
  response: AgentResponse | null
  error: string | null
}
