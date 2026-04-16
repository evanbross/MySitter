import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { display_name?: string; phone?: string; avatar_url?: string }) =>
      apiClient.users.updateMe(body),
    onSuccess: () => {
      // Invalidate the auth/me query so useAuth() picks up the new display_name / avatar
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
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
