import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, Review, ServiceType } from "@mysitter/types";
import { useProviderProfile } from "../../hooks/useProviders";
import { apiClient } from "../../lib/apiClient";

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  PET_SITTING: "Pet Sitting",
  HOUSE_SITTING: "House Sitting",
  DOG_WALKING: "Dog Walking",
  DROP_IN_VISIT: "Drop-In",
  DOGGY_DAY_CARE: "Day Care",
  BOARDING: "Boarding",
};

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: profile, isLoading } = useProviderProfile(id);

  const { data: reviewsData } = useQuery<PaginatedResponse<Review>>({
    queryKey: ["reviews", "provider", id],
    queryFn: () => apiClient.reviews.listForProvider(id!, 1, 10),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a1a2e" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Provider not found.</Text>
      </View>
    );
  }

  const initials = profile.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const reviews = reviewsData?.items ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile.display_name}</Text>
        <View style={styles.headerMeta}>
          {profile.rating != null && (
            <Text style={styles.rating}>★ {profile.rating.toFixed(1)}</Text>
          )}
          {profile.review_count > 0 && (
            <Text style={styles.reviewCount}>({profile.review_count} reviews)</Text>
          )}
          {profile.hourly_rate != null && (
            <Text style={styles.rate}>${profile.hourly_rate}/hr</Text>
          )}
        </View>

        {!profile.is_active && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveBadgeText}>Currently unavailable</Text>
          </View>
        )}
      </View>

      {/* Services */}
      {profile.services.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.chipRow}>
            {profile.services.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{SERVICE_TYPE_LABELS[s] ?? s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bio */}
      {profile.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {reviews.map((review) => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </View>
      )}

      {/* CTA */}
      {profile.is_active && (
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push(`/bookings/new?providerId=${profile.id}`)}
        >
          <Text style={styles.bookBtnText}>Book this Sitter</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function ReviewRow({ review }: { review: Review }) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewStars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Text key={i} style={i < review.rating ? styles.starFilled : styles.starEmpty}>
            ★
          </Text>
        ))}
      </View>
      {review.body && <Text style={styles.reviewBody}>{review.body}</Text>}
      <Text style={styles.reviewDate}>
        {new Date(review.created_at).toLocaleDateString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 15, color: "#6b7280" },

  // Header
  header: { alignItems: "center", backgroundColor: "#fff", paddingVertical: 28, paddingHorizontal: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#4338ca" },
  name: { fontSize: 22, fontWeight: "700", color: "#111", marginBottom: 8 },
  headerMeta: { flexDirection: "row", gap: 12, alignItems: "center" },
  rating: { fontSize: 15, color: "#f59e0b", fontWeight: "600" },
  reviewCount: { fontSize: 13, color: "#6b7280" },
  rate: { fontSize: 15, color: "#374151", fontWeight: "600" },
  inactiveBadge: {
    marginTop: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inactiveBadgeText: { fontSize: 12, color: "#92400e" },

  // Sections
  section: { backgroundColor: "#fff", marginTop: 10, paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#111", marginBottom: 10 },

  // Services
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#ede9fe",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: { fontSize: 13, color: "#5b21b6" },

  // Bio
  bio: { fontSize: 14, color: "#374151", lineHeight: 22 },

  // Reviews
  reviewRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  reviewStars: { flexDirection: "row", marginBottom: 6 },
  starFilled: { fontSize: 14, color: "#f59e0b" },
  starEmpty: { fontSize: 14, color: "#d1d5db" },
  reviewBody: { fontSize: 13, color: "#374151", lineHeight: 20, marginBottom: 4 },
  reviewDate: { fontSize: 11, color: "#9ca3af" },

  // Book CTA
  bookBtn: {
    margin: 20,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
