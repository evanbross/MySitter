/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomerProfile, CustomerProfileUpdate } from "@mysitter/types";
import { apiClient } from "../lib/apiClient";

export function useCustomerProfile() {
  return useQuery<CustomerProfile>({
    queryKey: ["customer-profile"],
    queryFn: () => apiClient.customerProfile.get(),
  });
}

export function useUpdateCustomerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CustomerProfileUpdate) => apiClient.customerProfile.update(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-profile"] }),
  });
}
