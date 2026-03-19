import { useCallback, useEffect, useRef, useState } from "react";
import {
  HubConnectionBuilder,
  HubConnectionState,
  type HubConnection,
  type ISubscription,
} from "@microsoft/signalr";
import type { CopilotTurn, CopilotState, ServerEvent } from "./types.ts";

interface CopilotResult {
  turn: CopilotTurn | null;
  state: CopilotState;
  error: string | null;
  isPending: boolean;
  isStreaming: boolean;
  isBusy: boolean;
  send: (query: string) => void;
  reset: () => void;
}

// Module-level singleton — survives React StrictMode double-mount without
// creating (and aborting) a second connection during development.
let sharedConn: HubConnection | null = null;
function getConnection(): HubConnection {
  if (!sharedConn) {
    sharedConn = new HubConnectionBuilder()
      .withUrl("/hubs/copilot")
      .withAutomaticReconnect()
      .build();
  }
  return sharedConn;
}

export function useCopilot(): CopilotResult {
  const [turn, setTurn] = useState<CopilotTurn | null>(null);
  const threadIdRef = useRef(crypto.randomUUID());
  const connRef = useRef<HubConnection | null>(null);
  const subRef = useRef<ISubscription<ServerEvent> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const conn = getConnection();
    connRef.current = conn;
    if (conn.state === HubConnectionState.Disconnected) {
      conn.start().catch((err) => console.error("SignalR connect failed:", err));
    }
    return () => {
      subRef.current?.dispose();
    };
  }, []);

  const reset = useCallback(() => {
    subRef.current?.dispose();
    subRef.current = null;
    cancelledRef.current = true;
    setTurn(null);
    threadIdRef.current = crypto.randomUUID();
  }, []);

  const send = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    subRef.current?.dispose();
    subRef.current = null;
    cancelledRef.current = false;

    setTurn({
      id: crypto.randomUUID(),
      query: trimmed,
      state: "pending",
      response: null,
      error: null,
      partialAnswer: null,
    });

    const update = (patch: Partial<CopilotTurn>) => {
      if (cancelledRef.current) return;
      setTurn((prev) => (prev ? { ...prev, ...patch } : prev));
    };

    (async () => {
      try {
        const conn = connRef.current;
        if (!conn) throw new Error("SignalR connection not initialised");

        if (conn.state === HubConnectionState.Disconnected) {
          await conn.start();
        }

        const subject = conn.stream<ServerEvent>("StreamQuery", {
          query: trimmed,
          threadId: threadIdRef.current,
        });

        subRef.current = subject.subscribe({
          next(msg) {
            if (cancelledRef.current) return;
            switch (msg.type) {
              case "delta":
                setTurn((prev) =>
                  prev
                    ? {
                        ...prev,
                        state: "streaming",
                        partialAnswer: (prev.partialAnswer ?? "") + msg.content,
                      }
                    : prev,
                );
                break;
              case "done":
                update({ state: "done", response: msg.response, error: null, partialAnswer: null });
                break;
              case "error":
                update({
                  state: "error",
                  response: null,
                  error: msg.message,
                  partialAnswer: null,
                });
                break;
            }
          },
          error(err) {
            if (cancelledRef.current) return;
            const message = err instanceof Error ? err.message : String(err);
            update({ state: "error", response: null, error: message, partialAnswer: null });
          },
          complete() {
            if (cancelledRef.current) return;
            setTurn((prev) => {
              if (!prev || prev.state === "done" || prev.state === "error") return prev;
              return {
                ...prev,
                state: "error",
                error: "Stream closed without a final response.",
                partialAnswer: null,
              };
            });
          },
        });
      } catch (err: unknown) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        update({ state: "error", response: null, error: message, partialAnswer: null });
      }
    })();
  }, []);

  const state: CopilotState = turn?.state ?? "idle";
  const isPending = state === "pending";
  const isStreaming = state === "streaming";
  const isBusy = isPending || isStreaming;
  const error = turn?.error ?? null;

  return { turn, state, error, isPending, isStreaming, isBusy, send, reset };
}
