import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Availability,
  AvailabilityCreate,
  AvailabilityUpdate,
  ProviderProfile,
  ProviderProfileUpdate,
  ProviderSearchResult,
  PaginatedResponse,
} from "@mysitter/types";
import { apiClient } from "@/lib/apiClient";

interface ProviderSearchParams {
  lat: number | null;
  lng: number | null;
  radius_miles?: number;
  service_type?: string;
  page?: number;
}

export function useProviderSearch(params: ProviderSearchParams) {
  return useQuery<PaginatedResponse<ProviderSearchResult>>({
    queryKey: ["providers", "search", params],
    queryFn: () =>
      apiClient.providers.search({
        lat: params.lat!,
        lng: params.lng!,
        radius_miles: params.radius_miles,
        service_type: params.service_type,
        page: params.page,
      }),
    enabled: params.lat !== null && params.lng !== null,
    staleTime: 1000 * 30,
  });
}

export function useProviderProfile(providerId: string | undefined) {
  return useQuery<ProviderProfile>({
    queryKey: ["provider", providerId],
    queryFn: () => apiClient.providers.getProfile(providerId!),
    enabled: !!providerId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProviderProfileBySlug(slug: string | undefined) {
  return useQuery<ProviderProfile>({
    queryKey: ["provider", "slug", slug],
    queryFn: () => apiClient.seo.getProviderBySlug(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMyProviderProfile(isProvider: boolean) {
  return useQuery<ProviderProfile>({
    queryKey: ["provider", "me"],
    queryFn: () => apiClient.providers.getMyProfile(),
    enabled: isProvider,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation<ProviderProfile, Error, ProviderProfileUpdate>({
    mutationFn: (data) => apiClient.providers.updateMyProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider", "me"] });
    },
  });
}

export function useProviderAvailability(providerId: string | undefined) {
  return useQuery<Availability[]>({
    queryKey: ["availability", providerId],
    queryFn: () => apiClient.providers.getAvailability(providerId!),
    enabled: !!providerId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAvailability() {
  const qc = useQueryClient();
  return useMutation<Availability, Error, AvailabilityCreate>({
    mutationFn: (data) => apiClient.providers.createAvailability(data),
    onSuccess: (_result, _vars, _ctx) => {
      // Invalidate both the current provider's and the "me" availability.
      // The providerId is not available here, so we invalidate all availability queries.
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

export function useUpdateAvailability() {
  const qc = useQueryClient();
  return useMutation<
    Availability,
    Error,
    { availabilityId: string; data: AvailabilityUpdate }
  >({
    mutationFn: ({ availabilityId, data }) =>
      apiClient.providers.updateAvailability(availabilityId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

export function useDeleteAvailability() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (availabilityId) =>
      apiClient.providers.deleteAvailability(availabilityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

export function useProviderReviews(providerId: string | undefined, page = 1) {
  return useQuery({
    queryKey: ["reviews", "provider", providerId, page],
    queryFn: () => apiClient.reviews.listForProvider(providerId!, { page }),
    enabled: !!providerId,
  });
}
