/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { Conversation } from "@mysitter/types";
import { apiClient } from "../../lib/apiClient";

export default function MessagesTab() {
  const router = useRouter();
  const {
    data: conversations,
    isLoading,
    error,
  } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => apiClient.messages.listConversations(),
    staleTime: 1000 * 30,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load conversations.</Text>
      </View>
    );
  }

  if (!conversations?.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No conversations yet.</Text>
        <Text style={styles.emptyHint}>Book a sitter to start chatting!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ConversationRow
          conv={item}
          onPress={() => router.push(`/conversations/${item.id}`)}
        />
      )}
      contentContainerStyle={styles.list}
    />
  );
}

function ConversationRow({
  conv,
  onPress,
}: {
  conv: Conversation;
  onPress: () => void;
}) {
  const initials = conv.other_party.display_name.charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        {conv.other_party.avatar_url ? (
          <Image source={{ uri: conv.other_party.avatar_url }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarInitial}>{initials}</Text>
        )}
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.name}>{conv.other_party.display_name}</Text>
          {conv.unread_count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conv.unread_count}</Text>
            </View>
          )}
        </View>

        {conv.last_message && (
          <Text style={styles.preview} numberOfLines={1}>
            {conv.last_message.body}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: { color: "#ef4444", fontSize: 15 },
  emptyText: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  emptyHint: { fontSize: 14, color: "#888" },
  list: { paddingTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#c5cae9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImg: { width: 48, height: 48 },
  avatarInitial: { fontSize: 20, fontWeight: "bold", color: "#3949ab" },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: { fontWeight: "600", fontSize: 15 },
  badge: {
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  preview: { fontSize: 13, color: "#666" },
});
