import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Conversation, Message, PaginatedResponse } from "@mysitter/types";
import { createWsClient } from "@mysitter/api-client";
import type { WsClient } from "@mysitter/api-client";
import { apiClient } from "@/lib/apiClient";

// WebSocket base URL: ws:// in dev, wss:// in prod.
const WS_BASE = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";

// ─── REST hooks ───────────────────────────────────────────────────────────────

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => apiClient.messages.listConversations(),
    staleTime: 1000 * 30,
  });
}

export function useConversationMessages(conversationId: string | undefined) {
  return useQuery<PaginatedResponse<Message>>({
    queryKey: ["messages", conversationId],
    queryFn: () => apiClient.messages.getMessages(conversationId!),
    enabled: !!conversationId,
    // Always fresh: new messages arrive via WS, but refetch on focus catches
    // messages sent while this tab was inactive.
    staleTime: 0,
  });
}

// ─── WebSocket hook ───────────────────────────────────────────────────────────

/**
 * Opens a WebSocket to the conversation channel and returns real-time
 * messages and a send function.  On unmount (or when conversationId changes)
 * the socket is cleanly closed.
 *
 * Messages that arrive via the socket are appended to `realtimeMessages`.
 * The caller is expected to de-duplicate against the REST-loaded history
 * (both sets will contain the same message once the REST query re-fetches).
 */
export function useChat(conversationId: string | undefined) {
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WsClient | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    setRealtimeMessages([]);

    const ws = createWsClient(
      WS_BASE,
      conversationId,
      () => localStorage.getItem("access_token"),
    );
    wsRef.current = ws;
    setIsConnected(true);

    const unsubscribe = ws.onMessage((msg) => {
      if (msg.type === "message") {
        const incoming = msg.payload as Message;
        setRealtimeMessages((prev) => {
          // Guard against duplicate delivery (shouldn't happen but cheap to check).
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
        // Invalidate the REST query so cursor-based pagination stays accurate
        // without requiring a manual refetch from the user.
        qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      }
    });

    return () => {
      unsubscribe();
      ws.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [conversationId, qc]);

  const sendMessage = useCallback(
    (body: string) => {
      wsRef.current?.send({ type: "message", payload: { body } });
    },
    [],
  );

  return { realtimeMessages, sendMessage, isConnected };
}
