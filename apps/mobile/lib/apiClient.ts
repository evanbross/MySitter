/**
 * Shared API client and WebSocket base URL for the mobile app.
 * Uses expo-secure-store for token storage; SecureStore.getItem is synchronous
 * in Expo SDK 52+ so it works directly as the getAccessToken callback.
 */
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { createApiClient } from "@mysitter/api-client";

const _extra = Constants.expoConfig?.extra ?? {};

export const API_BASE: string = _extra.apiUrl ?? "http://localhost:8000";
export const WS_BASE: string = _extra.wsUrl ?? "ws://localhost:8000";

const ACCESS_TOKEN_KEY = "access_token";

export function getAccessTokenSync(): string | null {
  return SecureStore.getItem(ACCESS_TOKEN_KEY);
}

export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export const apiClient = createApiClient({
  baseUrl: API_BASE,
  getAccessToken: getAccessTokenSync,
  onUnauthorized: () => {
    clearAccessToken();
  },
});
