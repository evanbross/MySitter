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
