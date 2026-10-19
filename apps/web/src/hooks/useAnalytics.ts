/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

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
