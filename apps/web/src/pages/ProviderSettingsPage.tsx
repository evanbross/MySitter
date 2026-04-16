import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMyProviderProfile, useUpdateProviderProfile } from "@/hooks/useProviderSettings";
import { useNavigate } from "react-router-dom";
import type { ServiceType } from "@mysitter/types";

const ALL_SERVICES: ServiceType[] = [
  "PET_SITTING",
  "HOUSE_SITTING",
  "DOG_WALKING",
  "DROP_IN_VISIT",
  "DOGGY_DAY_CARE",
  "BOARDING",
];

const SERVICE_LABELS: Record<ServiceType, string> = {
  PET_SITTING: "Pet Sitting",
  HOUSE_SITTING: "House Sitting",
  DOG_WALKING: "Dog Walking",
  DROP_IN_VISIT: "Drop-In Visit",
  DOGGY_DAY_CARE: "Doggy Day Care",
  BOARDING: "Boarding",
};

export default function ProviderSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useMyProviderProfile();
  const update = useUpdateProviderProfile();

  const [bio, setBio] = useState("");
  const [services, setServices] = useState<ServiceType[]>([]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("10");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-providers.
  useEffect(() => {
    if (user && user.role !== "PROVIDER") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Populate form from loaded profile.
  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? "");
    setServices((profile.services ?? []) as ServiceType[]);
    setHourlyRate(profile.hourly_rate != null ? String(profile.hourly_rate) : "");
    setRadiusMiles(String(profile.service_radius_miles ?? 10));
  }, [profile]);

  function toggleService(type: ServiceType) {
    setServices((prev) =>
      prev.includes(type) ? prev.filter((s) => s !== type) : [...prev, type],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      await update.mutateAsync({
        bio: bio || undefined,
        services,
        hourly_rate: hourlyRate ? Number(hourlyRate) : undefined,
        service_radius_miles: Number(radiusMiles),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (isLoading) return <div style={{ padding: 32 }}>Loading your profile…</div>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Sitter Profile Settings</h1>
      <p style={{ color: "#6b7280", marginBottom: 28, fontSize: 14 }}>
        This information is shown to customers on your public profile. Complete it to
        appear in search results.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Bio */}
        <label style={{ fontSize: 14, fontWeight: 600 }}>
          About you
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            placeholder="Describe your experience with pets, your home setup, and your availability…"
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: 10,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 15,
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </label>

        {/* Services */}
        <fieldset style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "12px 16px" }}>
          <legend style={{ fontSize: 14, fontWeight: 600, padding: "0 4px" }}>
            Services offered
          </legend>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 10,
              marginTop: 8,
            }}
          >
            {ALL_SERVICES.map((type) => (
              <label
                key={type}
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={services.includes(type)}
                  onChange={() => toggleService(type)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14 }}>{SERVICE_LABELS[type]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Hourly rate */}
        <label style={{ fontSize: 14, fontWeight: 600 }}>
          Hourly rate (USD)
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 16 }}>$</span>
            <input
              type="number"
              min={1}
              max={500}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="e.g. 25"
              style={{
                width: 120,
                padding: 10,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 15,
                boxSizing: "border-box",
              }}
            />
            <span style={{ fontSize: 13, color: "#6b7280" }}>/hr</span>
          </div>
        </label>

        {/* Service radius */}
        <label style={{ fontSize: 14, fontWeight: 600 }}>
          Service radius: {radiusMiles} miles
          <input
            type="range"
            min={1}
            max={50}
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            <span>1 mi</span>
            <span>50 mi</span>
          </div>
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
          disabled={update.isPending}
          style={{
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "12px",
            fontSize: 15,
            fontWeight: 700,
            cursor: update.isPending ? "not-allowed" : "pointer",
          }}
        >
          {update.isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
