/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ServiceType } from "@mysitter/types";
import { useProviderSearch } from "@/hooks/useProviders";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

const SERVICE_TYPES: ServiceType[] = [
  "PET_SITTING",
  "HOUSE_SITTING",
  "DOG_WALKING",
  "DROP_IN_VISIT",
  "DOGGY_DAY_CARE",
  "BOARDING",
];

// Default location (NYC) used as fallback if geolocation is denied.
const DEFAULT_LAT = 40.7128;
const DEFAULT_LNG = -74.006;

export default function SearchPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [serviceType, setServiceType] = useState<ServiceType | undefined>();

  const { data, isLoading } = useProviderSearch({
    lat,
    lng,
    radius_miles: radiusMiles,
    service_type: serviceType,
  });

  // Resolve user location once on mount.
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => {
        setLat(DEFAULT_LAT);
        setLng(DEFAULT_LNG);
      },
    );
  }, []);

  // Initialize Mapbox once we have a location.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || lat === null || lng === null) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 12,
    });

    new mapboxgl.Marker({ color: "#6366f1" })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup().setText("Your location"))
      .addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  // Sync provider markers whenever search results change.
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const provider of data?.items ?? []) {
      if (!provider.location) continue;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<strong>${provider.display_name}</strong><br/>` +
          `${provider.distance_miles.toFixed(1)} mi away<br/>` +
          `<a href="/providers/${provider.id}">View profile →</a>`,
      );

      const marker = new mapboxgl.Marker()
        .setLngLat([provider.location.lng, provider.location.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    }
  }, [data]);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          width: 360,
          overflowY: "auto",
          borderRight: "1px solid #e5e7eb",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
          Find a sitter
        </h1>

        {/* Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>
            Service type
            <select
              value={serviceType ?? ""}
              onChange={(e) =>
                setServiceType((e.target.value as ServiceType) || undefined)
              }
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: "6px 8px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <option value="">All services</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 14, fontWeight: 600 }}>
            Radius: {radiusMiles} miles
            <input
              type="range"
              min={1}
              max={50}
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
        </div>

        {/* Status line */}
        {lat === null ? (
          <p style={{ color: "#6b7280", fontSize: 14 }}>Getting your location…</p>
        ) : isLoading ? (
          <p style={{ color: "#6b7280", fontSize: 14 }}>Searching…</p>
        ) : (
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
            {data?.total ?? 0} sitter{data?.total !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Provider cards */}
        {data?.items.map((provider) => (
          <div
            key={provider.id}
            onClick={() => navigate(`/providers/${provider.id}`)}
            style={{
              cursor: "pointer",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#6366f1")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "#e5e7eb")
            }
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {provider.avatar_url ? (
                <img
                  src={provider.avatar_url}
                  alt={provider.display_name}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "#e0e7ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "#4f46e5",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {provider.display_name[0]}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {provider.display_name}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {provider.distance_miles.toFixed(1)} mi away
                  {provider.hourly_rate != null &&
                    ` · $${provider.hourly_rate}/hr`}
                </div>
                {provider.rating != null && (
                  <div style={{ fontSize: 13, color: "#f59e0b" }}>
                    ★ {provider.rating.toFixed(1)} ({provider.review_count})
                  </div>
                )}
              </div>
            </div>
            {provider.services.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                }}
              >
                {provider.services.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 11,
                      background: "#f3f4f6",
                      borderRadius: 4,
                      padding: "2px 6px",
                      color: "#374151",
                    }}
                  >
                    {s.replace(/_/g, " ")}
                  </span>
                ))}
                {provider.services.length > 3 && (
                  <span style={{ fontSize: 11, color: "#6b7280" }}>
                    +{provider.services.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div ref={mapContainerRef} style={{ flex: 1 }} />
    </div>
  );
}
