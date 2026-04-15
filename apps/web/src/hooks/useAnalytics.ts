import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export function useProviderAnalytics() {
  return useQuery({
    queryKey: ["analytics", "me"],
    queryFn: () => apiClient.analytics.getMyAnalytics(),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
        if (error?.status === 402) return false;
        return failureCount < 3;
    }
  });
}
