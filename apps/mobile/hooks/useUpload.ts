import { useState } from "react";
import { apiClient } from "../lib/apiClient";

interface UploadState {
  uploading: boolean;
  error: string | null;
}

interface UseUploadReturn extends UploadState {
  uploadPhoto: (fileUri: string, mimeType: string) => Promise<string | null>;
}

/**
 * Two-phase direct upload for React Native:
 *  1. POST /uploads/presign → presigned PUT URL + permanent public URL
 *  2. PUT the file bytes directly to storage via fetch + uri blob
 *  3. Return public URL so the caller can persist it (e.g. via providers.addPhoto)
 *
 * fileUri: local file URI from expo-image-picker (e.g. "file:///...")
 * mimeType: e.g. "image/jpeg"
 */
export function useUpload(): UseUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadPhoto(
    fileUri: string,
    mimeType: string,
  ): Promise<string | null> {
    setUploading(true);
    setError(null);

    try {
      const filename = fileUri.split("/").pop() ?? "photo.jpg";

      const { upload_url, public_url } = await apiClient.uploads.presign({
        filename,
        content_type: mimeType,
      });

      // React Native's fetch accepts a file:// URI as the body when wrapped in FormData,
      // but for a raw PUT we convert via blob for maximum compatibility.
      const fileResponse = await fetch(fileUri);
      const blob = await fileResponse.blob();

      const putResponse = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: blob,
      });

      if (!putResponse.ok) {
        throw new Error(`Storage upload failed: ${putResponse.status}`);
      }

      return public_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { uploading, error, uploadPhoto };
}
