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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const tokens = await apiClient.auth.login(email, password);
      await SecureStore.setItemAsync("access_token", tokens.access_token);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      Alert.alert("Sign in failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to mysitter</Text>
      {/*
        TODO (Phase 6): Mobile passkey authentication.

        The backend WebAuthn endpoints (/auth/passkey/registration-options,
        /auth/passkey/register, /auth/passkey/auth-options, /auth/passkey/authenticate)
        are fully implemented and tested against the web client.

        Blocker: no stable Expo-compatible passkey library exists as of 2026-04-15.
        Options to evaluate in Phase 6:
          - expo-passkeys (https://github.com/peterferguson/expo-passkeys) — watch for
            stable release with Android support.
          - react-native-passkey — evaluate when it supports Expo managed workflow.
          - Custom native module wrapping Android CredentialManager + iOS ASAuthorizationController.

        When a library lands, wire it against the existing apiClient.auth.getPasskeyAuthOptions()
        and apiClient.auth.verifyPasskeyAuth() calls in packages/api-client/src/client.ts.
      */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title={loading ? "Signing in…" : "Sign In"} onPress={handleLogin} disabled={loading} />
      <Button title="Create Account" onPress={() => router.push("/auth/register")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
});
