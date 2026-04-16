import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router"; // Added
import type { Booking, BookingStatus, ServiceType } from "@mysitter/types";
import {
  useBookings,
  useCancelBooking,
  useConfirmBooking,
  useCompleteBooking, // Added
} from "../../hooks/useBookings";
import { useAuth } from "../../hooks/useAuth";

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#10b981",
  CANCELLED: "#9ca3af",
  COMPLETED: "#6366f1",
};

const STATUS_BG: Record<BookingStatus, string> = {
  PENDING: "#fef3c7",
  CONFIRMED: "#d1fae5",
  CANCELLED: "#f3f4f6",
  COMPLETED: "#e0e7ff",
};

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  PET_SITTING: "Pet Sitting",
  HOUSE_SITTING: "House Sitting",
  DOG_WALKING: "Dog Walking",
  DROP_IN_VISIT: "Drop-In Visit",
  DOGGY_DAY_CARE: "Doggy Day Care",
  BOARDING: "Boarding",
};

export default function BookingsTab() {
  const { user } = useAuth();
  const router = useRouter(); // Added
  const { data, isLoading, refetch } = useBookings();
  const confirm = useConfirmBooking();
  const cancel = useCancelBooking();
  const complete = useCompleteBooking(); // Added

  const bookings = data?.items ?? [];

  function handleConfirm(booking: Booking) {
    Alert.alert("Confirm Booking", "Mark this booking as confirmed?", [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => confirm.mutate(booking.id) },
    ]);
  }

  function handleCancel(booking: Booking) {
    Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking?", [
      { text: "Keep", style: "cancel" },
      { text: "Cancel Booking", style: "destructive", onPress: () => cancel.mutate(booking.id) },
    ]);
  }

  function handleComplete(booking: Booking) {
    Alert.alert("Complete Booking", "Mark this booking as completed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Complete",
        onPress: () => complete.mutate(booking.id),
      },
    ]);
  }

  function handleLeaveReview(booking: Booking) {
    router.push(`/bookings/${booking.id}/review`);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a1a2e" />
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No bookings yet</Text>
        <Text style={styles.emptySubtext}>
          {user?.role === "PROVIDER"
            ? "You'll see booking requests from customers here."
            : "Search for a sitter to make your first booking."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            isProvider={user?.role === "PROVIDER"}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onComplete={handleComplete} // Added
            onLeaveReview={handleLeaveReview} // Added
          />
        )}
      />
    </View>
  );
}

// ── BookingCard ───────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking;
  isProvider: boolean;
  onConfirm: (b: Booking) => void;
  onCancel: (b: Booking) => void;
  onComplete: (b: Booking) => void; // Added
  onLeaveReview: (b: Booking) => void; // Added
}

function BookingCard({
  booking,
  isProvider,
  onConfirm,
  onCancel,
  onComplete,
  onLeaveReview,
}: BookingCardProps) {
  const start = new Date(booking.start_at);
  const end = new Date(booking.end_at);
  const canConfirm = isProvider && booking.status === "PENDING";
  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const canComplete = isProvider && booking.status === "CONFIRMED";
  const canReview = booking.status === "COMPLETED";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.serviceType}>
          {SERVICE_TYPE_LABELS[booking.service_type] ?? booking.service_type}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[booking.status] }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[booking.status] }]}>
            {booking.status}
          </Text>
        </View>
      </View>

      <Text style={styles.dateRange}>
        {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        {" — "}
        {end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </Text>
      <Text style={styles.time}>
        {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        {" to "}
        {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>

      {booking.notes && <Text style={styles.notes}>{booking.notes}</Text>}

      <View style={styles.actions}>
        {canConfirm && (
          <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(booking)}>
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(booking)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
        {canComplete && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#059669" }]}
            onPress={() => onComplete(booking)}
          >
            <Text style={styles.actionBtnText}>Mark Complete</Text>
          </TouchableOpacity>
        )}
        {canReview && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#6366f1" }]}
            onPress={() => onLeaveReview(booking)}
          >
            <Text style={styles.actionBtnText}>Leave Review</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  list: { padding: 12, gap: 10 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceType: { fontSize: 15, fontWeight: "600", color: "#111" },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: "700" },
  dateRange: { fontSize: 13, color: "#374151", marginBottom: 2 },
  time: { fontSize: 12, color: "#6b7280", marginBottom: 6 },
  notes: { fontSize: 13, color: "#6b7280", fontStyle: "italic", marginBottom: 6 },

  actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelBtnText: { color: "#374151", fontWeight: "600", fontSize: 14 },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
