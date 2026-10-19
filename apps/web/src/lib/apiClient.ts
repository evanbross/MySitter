/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { createApiClient } from "@mysitter/api-client";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

function handleUnauthorized(): void {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
}

export const apiClient = createApiClient({
  baseUrl: BASE_URL,
  getAccessToken,
  onUnauthorized: handleUnauthorized,
});
