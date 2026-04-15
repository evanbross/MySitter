import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { apiClient, getAccessTokenSync } from "../lib/apiClient";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

// Configure how notifications are presented when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken(): Promise<void> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  // Android requires a notification channel.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await apiClient.users.registerPushToken(token);
  } catch {
    // Push registration is best-effort — never crash the app over it.
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Attempt to register the push token if the user is already logged in.
    if (getAccessTokenSync()) {
      registerPushToken();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: "Sign In" }} />
        <Stack.Screen name="auth/register" options={{ title: "Create Account" }} />
        <Stack.Screen name="providers/[id]" options={{ title: "Sitter Profile" }} />
        <Stack.Screen name="bookings/[id]" options={{ title: "Booking" }} />
        <Stack.Screen name="bookings/new" options={{ title: "New Booking" }} />
        <Stack.Screen name="conversations/[id]" options={{ title: "Messages" }} />
      </Stack>
    </QueryClientProvider>
  );
}
