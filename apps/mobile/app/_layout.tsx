import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: "Sign In" }} />
        <Stack.Screen name="auth/register" options={{ title: "Create Account" }} />
        <Stack.Screen name="providers/[id]" options={{ title: "Sitter Profile" }} />
        <Stack.Screen name="bookings/[id]" options={{ title: "Booking" }} />
        <Stack.Screen name="conversations/[id]" options={{ title: "Messages" }} />
      </Stack>
    </QueryClientProvider>
  );
}
