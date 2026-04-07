import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@mysitter/types";
import { apiClient } from "@/lib/apiClient";

export function useAuth() {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["me"],
    queryFn: async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return null;
      try {
        return await apiClient.users.me();
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: ({
      email,
      password,
      totpCode,
    }: {
      email: string;
      password: string;
      totpCode?: string;
    }) => apiClient.auth.login(email, password, totpCode),
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.access_token);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.auth.logout(),
    onSuccess: () => {
      localStorage.removeItem("access_token");
      qc.clear();
    },
  });

  return {
    user: user ?? null,
    isLoading,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
  };
}
