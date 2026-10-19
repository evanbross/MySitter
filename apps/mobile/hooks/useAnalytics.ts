/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { ProviderAnalytics } from "@mysitter/types";

/**
 * Fetch analytics for the current provider user.
 *
 * @param enabled - Pass `false` to skip the request entirely (e.g. for
 *   CUSTOMER users). The API returns 402 for non-Pro/Premium providers and
 *   errors for customers, so callers that know the user is not a provider
 *   should set this to false to avoid unnecessary network traffic.
 */
export function useProviderAnalytics(enabled = true) {
  return useQuery<ProviderAnalytics>({
    queryKey: ["analytics", "me"],
    queryFn: () => apiClient.analytics.getMe(),
    retry: false, // 402 errors should not be retried
    enabled,
  });
}
