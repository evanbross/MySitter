/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@mysitter/types";
import { apiClient, clearAccessToken, getAccessTokenSync } from "../lib/apiClient";

export function useAuth() {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      if (!getAccessTokenSync()) return null;
      return apiClient.users.me();
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  async function logout() {
    await clearAccessToken();
    qc.setQueryData(["auth", "me"], null);
    qc.clear();
  }

  return { user: user ?? null, isLoading, logout };
}
