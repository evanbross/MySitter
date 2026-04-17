import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { ProviderProfile } from "@mysitter/types";

export function useMyProviderProfile(enabled = true) {
  return useQuery<ProviderProfile>({
    queryKey: ["providers", "me"],
    queryFn: () => apiClient.providers.getMyProfile(),
    retry: false,
    enabled,
  });
}

export function useUpdateProviderProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      bio?: string;
      services?: string[];
      hourly_rate?: number;
      service_radius_miles?: number;
    }) => apiClient.providers.updateMyProfile(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
