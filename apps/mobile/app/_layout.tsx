import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { apiClient } from "../lib/apiClient";
import { useAuth } from "../hooks/useAuth";

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

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <RootLayoutInner />
    </QueryClientProvider>
  );
}

/**
 * Inner layout rendered inside QueryClientProvider so that useAuth() —
 * which calls useQuery internally — has access to the query client context.
 * Gemini placed useAuth() in RootLayout (outside the provider), which would
 * throw "No QueryClient set" on every app launch.
 */
function RootLayoutInner() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Physical devices only — simulators cannot receive push notifications.
      if (Platform.OS === "web") return;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
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
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });

        // Fire-and-forget — don't block the UI on this.
        apiClient.users.updateMe({ expo_push_token: token }).catch(() => {
          // Non-fatal — notifications will simply not be delivered until next launch.
        });
      } catch {
        // Push registration is best-effort — never crash the app over it.
      }
    })();
  }, [user?.id]); // Only re-run if the logged-in user changes.

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ title: "Sign In" }} />
      <Stack.Screen name="auth/register" options={{ title: "Create Account" }} />
      <Stack.Screen name="providers/[id]" options={{ title: "Sitter Profile" }} />
      <Stack.Screen name="bookings/[id]" options={{ title: "Booking" }} />
      <Stack.Screen name="bookings/new" options={{ title: "New Booking" }} />
      <Stack.Screen name="conversations/[id]" options={{ title: "Messages" }} />
    </Stack>
  );
}
