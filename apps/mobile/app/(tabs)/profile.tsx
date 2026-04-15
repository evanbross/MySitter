import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProviderProfile, UserUpdate } from "@mysitter/types";
import { useAuth } from "../../hooks/useAuth";
import { apiClient } from "../../lib/apiClient";

const TIER_LABELS: Record<string, string> = {
  BASIC: "Basic",
  PRO: "Pro",
  PREMIUM: "Premium",
};

const TIER_COLORS: Record<string, string> = {
  BASIC: "#6b7280",
  PRO: "#6366f1",
  PREMIUM: "#f59e0b",
};

export default function ProfileTab() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const qc = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // Providers see their subscription tier.
  const { data: providerProfile } = useQuery<ProviderProfile>({
    queryKey: ["providers", "me"],
    queryFn: () => apiClient.providers.getMyProfile(),
    enabled: user?.role === "PROVIDER",
    retry: false,
  });

  const updateUser = useMutation<unknown, Error, UserUpdate>({
    mutationFn: (data) => apiClient.users.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      setEditingName(false);
    },
  });

  function handleEditName() {
    setNameValue(user?.display_name ?? "");
    setEditingName(true);
  }

  function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === user?.display_name) {
      setEditingName(false);
      return;
    }
    updateUser.mutate({ display_name: trimmed });
  }

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => {
        await logout();
        router.replace("/auth/login");
      }},
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a1a2e" />
      </View>
    );
  }

  if (!user) {
    router.replace("/auth/login");
    return null;
  }

  const initials = user.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const tier = providerProfile?.subscription_tier;

  return (
    <View style={styles.container}>
      {/* Avatar + name */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              value={nameValue}
              onChangeText={setNameValue}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingName(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={handleEditName}>
            <Text style={styles.name}>{user.display_name}</Text>
            <Text style={styles.nameHint}>Tap to edit</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.email}>{user.email}</Text>

        {/* Role badge */}
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{user.role}</Text>
        </View>

        {/* Subscription tier (providers only) */}
        {user.role === "PROVIDER" && tier && (
          <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[tier] + "22" }]}>
            <Text style={[styles.tierBadgeText, { color: TIER_COLORS[tier] }]}>
              {TIER_LABELS[tier] ?? tier} Plan
            </Text>
          </View>
        )}
      </View>

      {/* Info rows */}
      <View style={styles.section}>
        {user.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user.phone}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account type</Text>
          <Text style={styles.infoValue}>{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member since</Text>
          <Text style={styles.infoValue}>
            {new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </Text>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: { alignItems: "center", backgroundColor: "#fff", paddingVertical: 32, paddingHorizontal: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#4338ca" },

  name: { fontSize: 20, fontWeight: "700", color: "#111", textAlign: "center" },
  nameHint: { fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 2 },
  email: { fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 10 },

  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  nameInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    minWidth: 160,
    color: "#111",
  },
  saveBtn: { backgroundColor: "#1a1a2e", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  cancelText: { color: "#6b7280", fontSize: 14 },

  roleBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  roleBadgeText: { fontSize: 12, color: "#475569", fontWeight: "600" },
  tierBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  tierBadgeText: { fontSize: 13, fontWeight: "700" },

  section: {
    backgroundColor: "#fff",
    marginTop: 10,
    paddingHorizontal: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  infoLabel: { fontSize: 14, color: "#6b7280" },
  infoValue: { fontSize: 14, color: "#111", fontWeight: "500" },

  signOutBtn: {
    margin: 24,
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
});
