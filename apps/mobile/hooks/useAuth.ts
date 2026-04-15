import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@mysitter/types";
import { apiClient, clearAccessToken, getAccessTokenSync } from "../lib/apiClient";

export function useAuth() {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      if (!getAccessTokenSync()) return null;
      return apiClient.users.me();
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  async function logout() {
    await clearAccessToken();
    qc.setQueryData(["auth", "me"], null);
    qc.clear();
  }

  return { user: user ?? null, isLoading, logout };
}
