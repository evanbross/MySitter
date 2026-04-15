import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Subscription, SubscribeRequest, SubscribeResponse } from "@mysitter/types";
import { apiClient } from "@/lib/apiClient";

export function useSubscription() {
  return useQuery<Subscription | null>({
    queryKey: ["subscription"],
    queryFn: () => apiClient.billing.getSubscription(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation<SubscribeResponse, Error, SubscribeRequest>({
    mutationFn: (data) => apiClient.billing.subscribe(data),
    onSuccess: () => {
      // Subscription row will be created/updated by the Stripe webhook (invoice.paid),
      // but optimistically invalidate so the UI re-fetches after payment confirmation.
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export function usePortalUrl() {
  return useMutation<{ url: string }, Error, string>({
    // arg is the return_url to send back to after the Customer Portal session
    mutationFn: (returnUrl) => apiClient.billing.getPortalUrl(returnUrl),
  });
}
