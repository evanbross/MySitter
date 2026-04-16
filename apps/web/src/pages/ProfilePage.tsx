import { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateProfile, usePresignAvatarUpload } from "@/hooks/useProfile";

export default function ProfilePage() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const presign = usePresignAvatarUpload();

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      // 1. Get presigned PUT URL for the exact content type being uploaded.
      //    The presigned URL is scoped to a specific content-type; it must match
      //    the Content-Type header on the subsequent PUT or Spaces will reject it.
      const { upload_url, public_url } = await presign.mutateAsync({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });
      // 2. PUT the file directly to Spaces
      const res = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error("Upload failed");
      setAvatarUrl(public_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      await updateProfile.mutateAsync({
        display_name: displayName || undefined,
        phone: phone || undefined,
        avatar_url: avatarUrl || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 26, marginBottom: 28 }}>Account Settings</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#e0e7ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 700,
                color: "#4f46e5",
              }}
            >
              {(displayName || user?.display_name || "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                background: "none",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {uploading ? "Uploading…" : "Change photo"}
            </button>
          </div>
        </div>

        <label style={{ fontSize: 14, fontWeight: 600 }}>
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user?.display_name ?? ""}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />
        </label>

        <label style={{ fontSize: 14, fontWeight: 600 }}>
          Phone number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={user?.phone ?? ""}
            type="tel"
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />
        </label>

        {success && (
          <p style={{ color: "#059669", fontSize: 14, margin: 0, fontWeight: 600 }}>
            ✓ Profile updated
          </p>
        )}
        {error && (
          <p style={{ color: "#ef4444", fontSize: 14, margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={updateProfile.isPending}
          style={{
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "12px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
