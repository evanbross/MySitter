import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { CustomerProfile, CustomerProfileUpdate } from "@mysitter/types";
import { apiClient } from "@/lib/apiClient";

export function useCustomerProfile(): UseQueryResult<CustomerProfile> {
  return useQuery<CustomerProfile>({
    queryKey: ["customer-profile"],
    queryFn: () => apiClient.customerProfile.get(),
    retry: false,
  });
}

export function useUpdateCustomerProfile(): UseMutationResult<CustomerProfile, Error, CustomerProfileUpdate> {
  const queryClient = useQueryClient();
  return useMutation<CustomerProfile, Error, CustomerProfileUpdate>({
    mutationFn: (body) => apiClient.customerProfile.update(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
    },
  });
}
