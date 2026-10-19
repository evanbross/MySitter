/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import type { ProviderSearchResult, ServiceType } from "@mysitter/types";
import { useProviderSearch } from "../../hooks/useProviders";

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  PET_SITTING: "Pet Sitting",
  HOUSE_SITTING: "House Sitting",
  DOG_WALKING: "Dog Walking",
  DROP_IN_VISIT: "Drop-In",
  DOGGY_DAY_CARE: "Day Care",
  BOARDING: "Boarding",
};

const ALL_SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];

// Default fallback region (NYC) shown while requesting location.
const DEFAULT_REGION = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

type ViewMode = "map" | "list";

export default function SearchTab() {
  const router = useRouter();
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [locationReady, setLocationReady] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("map");

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setRegion({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }
      setLocationReady(true);
    })();
  }, []);

  const { data, isLoading } = useProviderSearch({
    lat: locationReady ? region.latitude : null,
    lng: locationReady ? region.longitude : null,
    service_type: serviceType,
    radius_miles: 10,
  });

  const providers = data?.items ?? [];

  function handleProviderPress(provider: ProviderSearchResult) {
    router.push(`/providers/${provider.id}`);
  }

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <Pressable
            style={[styles.filterChip, !serviceType && styles.filterChipActive]}
            onPress={() => setServiceType(undefined)}
          >
            <Text style={[styles.filterChipText, !serviceType && styles.filterChipTextActive]}>
              All
            </Text>
          </Pressable>
          {ALL_SERVICE_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[styles.filterChip, serviceType === type && styles.filterChipActive]}
              onPress={() => setServiceType(serviceType === type ? undefined : type)}
            >
              <Text style={[styles.filterChipText, serviceType === type && styles.filterChipTextActive]}>
                {SERVICE_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Map / List toggle */}
        <View style={styles.toggle}>
          <Pressable
            style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]}
            onPress={() => setViewMode("map")}
          >
            <Text style={[styles.toggleText, viewMode === "map" && styles.toggleTextActive]}>
              Map
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
            onPress={() => setViewMode("list")}
          >
            <Text style={[styles.toggleText, viewMode === "list" && styles.toggleTextActive]}>
              List
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main content */}
      {viewMode === "map" ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
          >
            {providers.map((p) => {
              if (!p.location) return null;
              return (
                <Marker
                  key={p.id}
                  coordinate={{ latitude: p.location.lat, longitude: p.location.lng }}
                  title={p.display_name}
                  description={p.hourly_rate ? `$${p.hourly_rate}/hr` : undefined}
                  onCalloutPress={() => handleProviderPress(p)}
                />
              );
            })}
          </MapView>

          {isLoading && (
            <View style={styles.mapOverlayLoader}>
              <ActivityIndicator color="#1a1a2e" />
            </View>
          )}

          {/* Compact card row at bottom of map */}
          {providers.length > 0 && (
            <View style={styles.mapCardStrip}>
              <FlatList
                horizontal
                data={providers}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
                renderItem={({ item }) => (
                  <ProviderCard provider={item} onPress={handleProviderPress} compact />
                )}
              />
            </View>
          )}
        </View>
      ) : (
        <>
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#1a1a2e" />
            </View>
          ) : providers.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No sitters found nearby.</Text>
              <Text style={styles.emptySubtext}>Try expanding your search radius or clearing the filter.</Text>
            </View>
          ) : (
            <FlatList
              data={providers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <ProviderCard provider={item} onPress={handleProviderPress} />
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

// ── Provider card ─────────────────────────────────────────────────────────────

interface ProviderCardProps {
  provider: ProviderSearchResult;
  onPress: (p: ProviderSearchResult) => void;
  compact?: boolean;
}

function ProviderCard({ provider, onPress, compact = false }: ProviderCardProps) {
  const initials = provider.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={() => onPress(provider)}>
        <View style={styles.compactAvatar}>
          <Text style={styles.compactAvatarText}>{initials}</Text>
        </View>
        <Text style={styles.compactName} numberOfLines={1}>{provider.display_name}</Text>
        {provider.rating != null && (
          <Text style={styles.compactRating}>★ {provider.rating.toFixed(1)}</Text>
        )}
        {provider.hourly_rate != null && (
          <Text style={styles.compactRate}>${provider.hourly_rate}/hr</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(provider)}>
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{provider.display_name}</Text>
        <View style={styles.cardMeta}>
          {provider.rating != null && (
            <Text style={styles.cardRating}>★ {provider.rating.toFixed(1)}</Text>
          )}
          {typeof provider.distance_miles === "number" && (
            <Text style={styles.cardDistance}>{provider.distance_miles.toFixed(1)} mi</Text>
          )}
          {provider.hourly_rate != null && (
            <Text style={styles.cardRate}>${provider.hourly_rate}/hr</Text>
          )}
        </View>
        {provider.services.length > 0 && (
          <Text style={styles.cardServices} numberOfLines={1}>
            {provider.services.map((s) => SERVICE_TYPE_LABELS[s] ?? s).join(" · ")}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },

  // Filter bar
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
  },
  filterScroll: { paddingHorizontal: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  filterChipActive: { backgroundColor: "#1a1a2e", borderColor: "#1a1a2e" },
  filterChipText: { fontSize: 13, color: "#374151" },
  filterChipTextActive: { color: "#fff" },

  // Toggle
  toggle: {
    flexDirection: "row",
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    overflow: "hidden",
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#fff" },
  toggleBtnActive: { backgroundColor: "#1a1a2e" },
  toggleText: { fontSize: 13, color: "#374151" },
  toggleTextActive: { color: "#fff" },

  // Map
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapOverlayLoader: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 8,
  },
  mapCardStrip: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 24 : 12,
    left: 0,
    right: 0,
    paddingVertical: 12,
  },

  // List
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#111", marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: "#6b7280", textAlign: "center" },
  listContent: { padding: 12, gap: 10 },

  // Full card
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardAvatarText: { fontSize: 18, fontWeight: "700", color: "#4338ca" },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: "#111", marginBottom: 4 },
  cardMeta: { flexDirection: "row", gap: 10, marginBottom: 4 },
  cardRating: { fontSize: 13, color: "#f59e0b", fontWeight: "600" },
  cardDistance: { fontSize: 13, color: "#6b7280" },
  cardRate: { fontSize: 13, color: "#374151", fontWeight: "500" },
  cardServices: { fontSize: 12, color: "#9ca3af" },

  // Compact card (map strip)
  compactCard: {
    width: 120,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  compactAvatarText: { fontSize: 14, fontWeight: "700", color: "#4338ca" },
  compactName: { fontSize: 12, fontWeight: "600", color: "#111", textAlign: "center", marginBottom: 2 },
  compactRating: { fontSize: 11, color: "#f59e0b", fontWeight: "600" },
  compactRate: { fontSize: 11, color: "#374151" },
});
