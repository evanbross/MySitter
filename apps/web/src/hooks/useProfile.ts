/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { display_name?: string; phone?: string; avatar_url?: string }) =>
      apiClient.users.updateMe(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function usePresignAvatarUpload() {
  return useMutation({
    // Accept both fileName and contentType so the presigned URL content-type
    // matches the actual file being uploaded. Mismatching types cause Spaces to
    // reject the PUT with 403 SignatureDoesNotMatch.
    mutationFn: ({ fileName, contentType }: { fileName: string; contentType: string }) =>
      apiClient.uploads.presign({ filename: fileName, content_type: contentType }),
  });
}
