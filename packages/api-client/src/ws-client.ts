import type { WsIncomingMessage, WsOutgoingMessage } from "@mysitter/types";

export type WsMessageHandler = (message: WsIncomingMessage) => void;
export type WsErrorHandler = (event: Event) => void;
export type WsCloseHandler = (event: CloseEvent) => void;

export interface WsClient {
  send: (message: WsOutgoingMessage) => void;
  close: () => void;
  onMessage: (handler: WsMessageHandler) => () => void;
}

/**
 * Creates a WebSocket connection to a conversation channel.
 * Automatically sends the access token as a query param for auth,
 * since browser WebSocket API doesn't support custom headers.
 */
export function createWsClient(
  baseWsUrl: string,
  conversationId: string,
  getAccessToken: () => string | null,
): WsClient {
  const token = getAccessToken();
  const url = `${baseWsUrl}/ws/conversations/${conversationId}${token ? `?token=${token}` : ""}`;
  const socket = new WebSocket(url);
  const handlers = new Set<WsMessageHandler>();

  socket.addEventListener("message", (event: MessageEvent) => {
    try {
      const parsed = JSON.parse(event.data as string) as WsIncomingMessage;
      handlers.forEach((h) => h(parsed));
    } catch {
      // malformed frame — ignore
    }
  });

  return {
    send(message: WsOutgoingMessage): void {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    },

    close(): void {
      socket.close();
    },

    onMessage(handler: WsMessageHandler): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}
