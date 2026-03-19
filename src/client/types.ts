export type AgentType = "lookup" | "search" | "analytics" | "clinical" | "cohort" | "export";

export type Confidence = "high" | "medium" | "low";

export interface Citation {
  resourceType: string;
  id: string;
}

export interface AgentResponse {
  answer: string;
  citations: Citation[];
  reasoning: string[];
  toolsUsed: string[];
  agentUsed: AgentType;
  confidence: Confidence;
}

export type CopilotState = "idle" | "pending" | "streaming" | "done" | "error";

export interface CopilotTurn {
  id: string;
  query: string;
  state: Exclude<CopilotState, "idle">;
  response: AgentResponse | null;
  error: string | null;
  partialAnswer: string | null;
}

// Server → Client SignalR stream events (discriminated union)
export type ServerEvent =
  | { type: "meta"; agentType: string; threadId: string }
  | { type: "delta"; content: string }
  | { type: "tool"; name: string; preview: string }
  | { type: "done"; response: AgentResponse }
  | { type: "error"; message: string };
