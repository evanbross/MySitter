import { useQuery } from "@tanstack/react-query";
import type { Availability, PaginatedResponse, ProviderProfile, ProviderSearchResult } from "@mysitter/types";
import { apiClient } from "../lib/apiClient";

export function useProviderSearch(params: {
  lat: number | null;
  lng: number | null;
  radius_miles?: number;
  service_type?: string;
}) {
  return useQuery<PaginatedResponse<ProviderSearchResult>>({
    queryKey: ["providers", "search", params],
    queryFn: () =>
      apiClient.providers.search({
        lat: params.lat!,
        lng: params.lng!,
        radius_miles: params.radius_miles ?? 10,
        service_type: params.service_type,
      }),
    enabled: params.lat !== null && params.lng !== null,
    staleTime: 30_000,
  });
}

export function useProviderProfile(providerId: string | undefined) {
  return useQuery<ProviderProfile>({
    queryKey: ["providers", providerId],
    queryFn: () => apiClient.providers.getProfile(providerId!),
    enabled: !!providerId,
    staleTime: 60_000,
  });
}

export function useProviderAvailability(providerId: string | undefined) {
  return useQuery<Availability[]>({
    queryKey: ["providers", providerId, "availability"],
    queryFn: () => apiClient.providers.getAvailability(providerId!),
    enabled: !!providerId,
  });
}
