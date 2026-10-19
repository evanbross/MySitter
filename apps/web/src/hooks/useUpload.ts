/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";

interface UploadState {
  uploading: boolean;
  error: string | null;
}

interface UseUploadReturn extends UploadState {
  uploadPhoto: (file: File) => Promise<string | null>;
}

/**
 * Two-phase direct upload:
 *  1. POST /uploads/presign → get a presigned PUT URL + the final public URL
 *  2. PUT the file directly to storage (no server proxy)
 *  3. Return the public URL so the caller can persist it (e.g. via providers.addPhoto)
 */
export function useUpload(): UseUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadPhoto(file: File): Promise<string | null> {
    setUploading(true);
    setError(null);

    try {
      const { upload_url, public_url } = await apiClient.uploads.presign({
        filename: file.name,
        content_type: file.type,
      });

      const putResponse = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
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
