/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { createApiClient } from "@mysitter/api-client";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:8000";
const apiClient = createApiClient({
  baseUrl: API_URL,
  getAccessToken: () => SecureStore.getItem("access_token"),
});

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", display_name: "", role: "CUSTOMER" });
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      const tokens = await apiClient.auth.register({ ...form });
      await SecureStore.setItemAsync("access_token", tokens.access_token);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      Alert.alert("Registration failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        value={form.display_name}
        onChangeText={(v) => setForm({ ...form, display_name: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(v) => setForm({ ...form, email: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={form.password}
        onChangeText={(v) => setForm({ ...form, password: v })}
      />
      <Button
        title={loading ? "Creating account…" : "Create Account"}
        onPress={handleRegister}
        disabled={loading}
      />
      <Button title="Already have an account? Sign in" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
});
