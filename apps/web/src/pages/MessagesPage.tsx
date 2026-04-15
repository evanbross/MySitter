import { useMemo, useRef, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Conversation, Message } from "@mysitter/types";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, useConversationMessages, useChat } from "@/hooks/useMessages";

export default function MessagesPage() {
  const { user } = useAuth();
  const { data: conversations, isLoading: loadingConvs } = useConversations();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: historyData } = useConversationMessages(selectedId);
  const { realtimeMessages, sendMessage, isConnected } = useChat(selectedId);

  // Merge REST-loaded history with real-time arrivals; de-duplicate by id.
  const allMessages = useMemo<Message[]>(() => {
    const history = historyData?.items ?? [];
    const historyIds = new Set(history.map((m) => m.id));
    const newRt = realtimeMessages.filter((m) => !historyIds.has(m.id));
    return [...history, ...newRt].sort((a, b) =>
      a.created_at < b.created_at ? -1 : 1,
    );
  }, [historyData, realtimeMessages]);

  // Scroll to bottom whenever the message list grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !isConnected) return;
    sendMessage(body);
    setDraft("");
  }

  const selectedConv = conversations?.find((c) => c.id === selectedId);

  return (
    <div style={styles.page}>
      {/* ── Conversation list ─────────────────────────────────────── */}
      <aside style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Messages</h2>

        {loadingConvs && <p style={styles.hint}>Loading…</p>}
        {!loadingConvs && !conversations?.length && (
          <p style={styles.hint}>No conversations yet.</p>
        )}

        {conversations?.map((conv) => (
          <ConversationRow
            key={conv.id}
            conv={conv}
            selected={conv.id === selectedId}
            onClick={() => setSelectedId(conv.id)}
          />
        ))}
      </aside>

      {/* ── Chat panel ───────────────────────────────────────────── */}
      <main style={styles.chat}>
        {!selectedId ? (
          <div style={styles.empty}>
            <span>Select a conversation to start chatting.</span>
          </div>
        ) : (
          <>
            <header style={styles.chatHeader}>
              <strong>{selectedConv?.other_party.display_name ?? "Chat"}</strong>
              <span style={{ ...styles.dot, background: isConnected ? "#22c55e" : "#ef4444" }} />
            </header>

            <div style={styles.messageList}>
              {allMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMine={msg.sender_id === user?.id}
                />
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} style={styles.inputRow}>
              <input
                style={styles.input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                disabled={!isConnected}
              />
              <button type="submit" style={styles.sendBtn} disabled={!draft.trim() || !isConnected}>
                Send
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConversationRow({
  conv,
  selected,
  onClick,
}: {
  conv: Conversation;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      style={{ ...styles.convRow, background: selected ? "#e8eaf6" : "transparent" }}
      onClick={onClick}
    >
      <div style={styles.convAvatar}>
        {conv.other_party.avatar_url ? (
          <img src={conv.other_party.avatar_url} alt="" style={styles.avatarImg} />
        ) : (
          <span style={styles.avatarFallback}>
            {conv.other_party.display_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div style={styles.convInfo}>
        <div style={styles.convName}>
          {conv.other_party.display_name}
          {conv.unread_count > 0 && (
            <span style={styles.badge}>{conv.unread_count}</span>
          )}
        </div>
        {conv.last_message && (
          <div style={styles.convPreview}>
            {conv.last_message.body.slice(0, 60)}
          </div>
        )}
      </div>
    </button>
  );
}

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div style={{ ...styles.bubbleWrapper, justifyContent: isMine ? "flex-end" : "flex-start" }}>
      <div
        style={{
          ...styles.bubble,
          background: isMine ? "#1a1a2e" : "#f1f3f4",
          color: isMine ? "#fff" : "#111",
        }}
      >
        {msg.body}
        <div style={styles.bubbleTime}>
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    display: "flex",
    height: "calc(100vh - 56px)", // subtract nav height
    fontFamily: "sans-serif",
  } as React.CSSProperties,

  sidebar: {
    width: 300,
    minWidth: 240,
    borderRight: "1px solid #e0e0e0",
    overflowY: "auto" as const,
    padding: "16px 0",
  } as React.CSSProperties,

  sidebarTitle: {
    margin: "0 16px 12px",
    fontSize: 18,
  } as React.CSSProperties,

  hint: {
    padding: "0 16px",
    color: "#888",
    fontSize: 14,
  } as React.CSSProperties,

  convRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "10px 16px",
    border: "none",
    cursor: "pointer",
    textAlign: "left" as const,
  } as React.CSSProperties,

  convAvatar: {
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: "50%",
    overflow: "hidden",
    background: "#c5cae9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  avatarImg: { width: "100%", height: "100%", objectFit: "cover" as const },

  avatarFallback: { fontWeight: "bold", color: "#3949ab" } as React.CSSProperties,

  convInfo: { flex: 1, minWidth: 0 } as React.CSSProperties,

  convName: {
    fontWeight: 600,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties,

  badge: {
    background: "#1a1a2e",
    color: "#fff",
    borderRadius: 10,
    padding: "1px 6px",
    fontSize: 11,
  } as React.CSSProperties,

  convPreview: {
    fontSize: 12,
    color: "#666",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    marginTop: 2,
  } as React.CSSProperties,

  chat: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  } as React.CSSProperties,

  empty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#888",
  } as React.CSSProperties,

  chatHeader: {
    padding: "12px 20px",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 16,
  } as React.CSSProperties,

  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  } as React.CSSProperties,

  messageList: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  } as React.CSSProperties,

  bubbleWrapper: {
    display: "flex",
  } as React.CSSProperties,

  bubble: {
    maxWidth: "70%",
    padding: "8px 12px",
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.4,
  } as React.CSSProperties,

  bubbleTime: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 4,
    textAlign: "right" as const,
  } as React.CSSProperties,

  inputRow: {
    display: "flex",
    gap: 8,
    padding: "12px 20px",
    borderTop: "1px solid #e0e0e0",
  } as React.CSSProperties,

  input: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #ccc",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties,

  sendBtn: {
    padding: "8px 20px",
    background: "#1a1a2e",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
  } as React.CSSProperties,
};
