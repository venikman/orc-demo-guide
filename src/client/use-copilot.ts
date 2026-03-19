import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HubConnectionBuilder,
  HubConnectionState,
  type HubConnection,
  type ISubscription,
} from "@microsoft/signalr";
import type { CopilotTurn, CopilotState, ServerEvent } from "./types.ts";

interface CopilotResult {
  latestTurn: CopilotTurn | null;
  state: CopilotState;
  error: string | null;
  isPending: boolean;
  isStreaming: boolean;
  isBusy: boolean;
  send: (query: string) => void;
  reset: () => void;
}

function buildConnection(): HubConnection {
  return new HubConnectionBuilder().withUrl("/hubs/copilot").withAutomaticReconnect().build();
}

export function useCopilot(): CopilotResult {
  const [turns, setTurns] = useState<CopilotTurn[]>([]);
  const threadIdRef = useRef(crypto.randomUUID());
  const connRef = useRef<HubConnection | null>(null);
  const subRef = useRef<ISubscription<ServerEvent> | null>(null);
  const cancelledRef = useRef(false);
  const readyPromiseRef = useRef<Promise<void> | null>(null);
  const readyResolveRef = useRef<(() => void) | null>(null);
  const readyRejectRef = useRef<((err: Error) => void) | null>(null);

  // Start the SignalR connection once on mount.
  // Register onreconnected/onclose once to populate readyPromiseRef
  // so send() can await reconnection without accumulating handlers.
  useEffect(() => {
    const conn = buildConnection();
    connRef.current = conn;

    conn.onreconnected(() => {
      const resolve = readyResolveRef.current;
      readyPromiseRef.current = null;
      readyResolveRef.current = null;
      readyRejectRef.current = null;
      resolve?.();
    });
    conn.onclose((err) => {
      const reject = readyRejectRef.current;
      readyPromiseRef.current = null;
      readyResolveRef.current = null;
      readyRejectRef.current = null;
      reject?.(err ?? new Error("Connection closed"));
    });

    conn.start().catch((err) => console.error("SignalR connect failed:", err));

    return () => {
      subRef.current?.dispose();
      conn.stop();
    };
  }, []);

  const reset = useCallback(() => {
    subRef.current?.dispose();
    subRef.current = null;
    cancelledRef.current = true;
    setTurns([]);
    threadIdRef.current = crypto.randomUUID();
  }, []);

  const send = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Cancel any in-flight stream
    subRef.current?.dispose();
    subRef.current = null;
    cancelledRef.current = false;

    const turnId = crypto.randomUUID();
    setTurns((prev) => [
      ...prev,
      {
        id: turnId,
        query: trimmed,
        state: "pending",
        response: null,
        error: null,
        partialAnswer: null,
      },
    ]);

    const updateTurn = (patch: Partial<CopilotTurn>) => {
      if (cancelledRef.current) return;
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, ...patch } : t)));
    };

    const appendDelta = (content: string) => {
      if (cancelledRef.current) return;
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? { ...t, state: "streaming", partialAnswer: (t.partialAnswer ?? "") + content }
            : t,
        ),
      );
    };

    (async () => {
      try {
        const conn = connRef.current;
        if (!conn) throw new Error("SignalR connection not initialised");

        // Ensure connected (handles page-load race & reconnects)
        if (conn.state === HubConnectionState.Disconnected) {
          await conn.start();
        } else if (conn.state !== HubConnectionState.Connected) {
          if (!readyPromiseRef.current) {
            readyPromiseRef.current = new Promise<void>((resolve, reject) => {
              readyResolveRef.current = resolve;
              readyRejectRef.current = reject;
            });
          }
          await readyPromiseRef.current;
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
                appendDelta(msg.content);
                break;
              case "done":
                updateTurn({
                  state: "done",
                  response: msg.response,
                  error: null,
                  partialAnswer: null,
                });
                break;
              case "error":
                updateTurn({
                  state: "error",
                  response: null,
                  error: msg.message,
                  partialAnswer: null,
                });
                break;
              case "meta":
              case "tool":
                break;
            }
          },
          error(err) {
            if (cancelledRef.current) return;
            const message = err instanceof Error ? err.message : String(err);
            updateTurn({ state: "error", response: null, error: message, partialAnswer: null });
          },
          complete() {
            if (cancelledRef.current) return;
            // If done/error was already received, the turn is settled — skip to
            // avoid a spurious setTurns that creates a new array reference.
            setTurns((prev) => {
              const target = prev.find((t) => t.id === turnId);
              if (!target || target.state === "done" || target.state === "error") return prev;
              return prev.map((t) =>
                t.id === turnId
                  ? {
                      ...t,
                      state: "error" as const,
                      error: "Stream closed without a final response.",
                      partialAnswer: null,
                    }
                  : t,
              );
            });
          },
        });
      } catch (err: unknown) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        updateTurn({ state: "error", response: null, error: message, partialAnswer: null });
      }
    })();
  }, []);

  const latestTurn = useMemo(() => turns.at(-1) ?? null, [turns]);
  const state = latestTurn?.state ?? "idle";
  const isPending = state === "pending";
  const isStreaming = state === "streaming";
  const isBusy = isPending || isStreaming;
  const error = latestTurn?.error ?? null;

  return { latestTurn, state, error, isPending, isStreaming, isBusy, send, reset };
}
