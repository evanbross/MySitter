import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Availability,
  AvailabilityCreate,
  PaginatedResponse,
  ProviderProfile,
  ProviderSearchResult,
} from "@mysitter/types";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "./useAuth";

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

export function useMyProviderProfile() {
  const { user } = useAuth();
  return useQuery<ProviderProfile>({
    queryKey: ["providers", "me"],
    queryFn: () => apiClient.providers.getMyProfile(),
    enabled: user?.role === "PROVIDER",
  });
}

export function useProviderAvailability(providerId: string | undefined) {
  return useQuery<Availability[]>({
    queryKey: ["availability", providerId],
    queryFn: () => apiClient.providers.getAvailability(providerId!),
    enabled: !!providerId,
  });
}

// useCreateAvailability — POST a new availability block
export function useCreateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AvailabilityCreate) =>
      apiClient.providers.createAvailability(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

// useDeleteAvailability — DELETE an availability block
export function useDeleteAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (availabilityId: string) =>
      apiClient.providers.deleteAvailability(availabilityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}
