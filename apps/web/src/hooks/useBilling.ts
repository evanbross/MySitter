/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { SubscriptionResponse } from "@mysitter/types"; // Added type import

export function useSubscription() {
  return useQuery<SubscriptionResponse | null>({ // Added type for useQuery
    queryKey: ["billing", "subscription"],
    queryFn: () => apiClient.billing.getSubscription(),
  });
}

export function usePortalUrl() {
  return useMutation({
    mutationFn: (returnUrl: string) => apiClient.billing.getPortalUrl(returnUrl),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tier: string) => apiClient.billing.subscribe(tier),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
  });
}
