/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startAuthentication } from "@simplewebauthn/browser";
import { apiClient } from "@/lib/apiClient";

export function usePasskeyAuth() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (email: string) => {
      // 1. Get challenge + allowed credentials from server
      const options = await apiClient.auth.getPasskeyAuthOptions(email);

      // 2. Hand off to the browser — triggers biometric prompt (Face ID, Touch ID, etc.)
      //    @simplewebauthn/browser handles base64url encoding and cross-browser quirks.
      //    Cast is safe: our PasskeyAuthenticationOptions JSON shape is compatible at runtime.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const credential = await startAuthentication({ optionsJSON: options as any });

      // 3. Send the signed assertion to the server for verification
      return apiClient.auth.verifyPasskeyAuth(credential);
    },
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.access_token);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return {
    loginWithPasskey: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
