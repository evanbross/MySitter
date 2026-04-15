import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ServiceType } from "@mysitter/types";
import { useCreateBooking } from "../../hooks/useBookings";
import { useProviderProfile } from "../../hooks/useProviders";

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "PET_SITTING", label: "Pet Sitting" },
  { value: "HOUSE_SITTING", label: "House Sitting" },
  { value: "DOG_WALKING", label: "Dog Walking" },
  { value: "DROP_IN_VISIT", label: "Drop-In Visit" },
  { value: "DOGGY_DAY_CARE", label: "Doggy Day Care" },
  { value: "BOARDING", label: "Boarding" },
];

// Expects ISO 8601 strings like "2026-04-15T10:00"
function parseLocalDatetime(value: string): Date | null {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export default function NewBookingScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const router = useRouter();
  const createBooking = useCreateBooking();
  const { data: profile } = useProviderProfile(providerId);

  const [serviceType, setServiceType] = useState<ServiceType>("PET_SITTING");
  // Users enter dates as "YYYY-MM-DDTHH:MM" (ISO local format)
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    const start = parseLocalDatetime(startAt);
    const end = parseLocalDatetime(endAt);

    if (!providerId) {
      Alert.alert("Error", "Provider ID is missing.");
      return;
    }
    if (!start) {
      Alert.alert("Invalid date", "Please enter a valid start date (YYYY-MM-DDTHH:MM).");
      return;
    }
    if (!end) {
      Alert.alert("Invalid date", "Please enter a valid end date (YYYY-MM-DDTHH:MM).");
      return;
    }
    if (end <= start) {
      Alert.alert("Invalid dates", "End time must be after start time.");
      return;
    }

    try {
      await createBooking.mutateAsync({
        provider_id: providerId,
        service_type: serviceType,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        notes: notes.trim() || undefined,
      });
      Alert.alert("Booking Sent", "Your booking request has been sent to the sitter.", [
        { text: "OK", onPress: () => router.replace("/(tabs)/bookings") },
      ]);
    } catch {
      Alert.alert("Error", "Failed to send booking request. Please try again.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {profile && (
        <View style={styles.providerRow}>
          <Text style={styles.providerLabel}>Booking with</Text>
          <Text style={styles.providerName}>{profile.display_name}</Text>
        </View>
      )}

      {/* Service type */}
      <Text style={styles.label}>Service Type</Text>
      <View style={styles.chipRow}>
        {SERVICE_TYPES.map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            style={[styles.chip, serviceType === value && styles.chipActive]}
            onPress={() => setServiceType(value)}
          >
            <Text style={[styles.chipText, serviceType === value && styles.chipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dates */}
      <Text style={styles.label}>Start Date & Time</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DDTHH:MM  (e.g. 2026-05-01T09:00)"
        placeholderTextColor="#9ca3af"
        value={startAt}
        onChangeText={setStartAt}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.label}>End Date & Time</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DDTHH:MM  (e.g. 2026-05-01T17:00)"
        placeholderTextColor="#9ca3af"
        value={endAt}
        onChangeText={setEndAt}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      {/* Notes */}
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Anything the sitter should know about your pet…"
        placeholderTextColor="#9ca3af"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, createBooking.isPending && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={createBooking.isPending}
      >
        {createBooking.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Send Booking Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, gap: 4 },

  providerRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  providerLabel: { fontSize: 14, color: "#6b7280" },
  providerName: { fontSize: 16, fontWeight: "700", color: "#111" },

  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111",
  },
  notesInput: { height: 100 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#1a1a2e", borderColor: "#1a1a2e" },
  chipText: { fontSize: 13, color: "#374151" },
  chipTextActive: { color: "#fff" },

  submitBtn: {
    marginTop: 28,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
