import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Message, PaginatedResponse } from "@mysitter/types";
import { createWsClient } from "@mysitter/api-client";
import type { WsClient } from "@mysitter/api-client";
import { apiClient, WS_BASE, getAccessTokenSync } from "../../lib/apiClient";
import { useAuth } from "../../hooks/useAuth";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();

  // ── REST: load history ────────────────────────────────────────────────────
  const { data: historyData, isLoading } = useQuery<PaginatedResponse<Message>>({
    queryKey: ["messages", id],
    queryFn: () => apiClient.messages.getMessages(id!),
    enabled: !!id,
    staleTime: 0,
  });

  // ── WebSocket: real-time messages ─────────────────────────────────────────
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WsClient | null>(null);

  useEffect(() => {
    if (!id) return;
    setRealtimeMessages([]);

    const ws = createWsClient(WS_BASE, id, getAccessTokenSync);
    wsRef.current = ws;
    setIsConnected(true);

    const unsubscribe = ws.onMessage((msg) => {
      if (msg.type === "message") {
        const incoming = msg.payload as Message;
        setRealtimeMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
        qc.invalidateQueries({ queryKey: ["messages", id] });
      }
    });

    return () => {
      unsubscribe();
      ws.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [id, qc]);

  // ── Merge history + real-time ─────────────────────────────────────────────
  const allMessages = useMemo<Message[]>(() => {
    const history = historyData?.items ?? [];
    const historyIds = new Set(history.map((m) => m.id));
    const newRt = realtimeMessages.filter((m) => !historyIds.has(m.id));
    return [...history, ...newRt].sort((a, b) =>
      a.created_at < b.created_at ? -1 : 1,
    );
  }, [historyData, realtimeMessages]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const [draft, setDraft] = useState("");
  const flatListRef = useRef<FlatList<Message>>(null);

  const handleSend = useCallback(() => {
    const body = draft.trim();
    if (!body || !isConnected) return;
    wsRef.current?.send({ type: "message", payload: { body } });
    setDraft("");
  }, [draft, isConnected]);

  // Scroll to bottom on new messages.
  useEffect(() => {
    if (allMessages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [allMessages.length]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble msg={item} isOwn={item.sender_id === user?.id} />}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message…"
          editable={isConnected}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || !isConnected) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || !isConnected}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  return (
    <View style={[styles.bubbleWrapper, isOwn && styles.bubbleWrapperOwn]}>
      <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
        <Text style={[styles.bubbleBody, isOwn && styles.bubbleBodyOwn]}>{msg.body}</Text>
        <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  messageList: { padding: 12, gap: 8 },
  bubbleWrapper: { alignItems: "flex-start", marginBottom: 4 },
  bubbleWrapperOwn: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "80%",
    backgroundColor: "#f1f3f4",
    borderRadius: 16,
    padding: 10,
  },
  bubbleOwn: { backgroundColor: "#1a1a2e" },
  bubbleBody: { fontSize: 14, color: "#111" },
  bubbleBodyOwn: { color: "#fff" },
  bubbleTime: { fontSize: 10, color: "#888", marginTop: 4, textAlign: "right" },
  bubbleTimeOwn: { color: "#94a3b8" },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e0e0e0",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
