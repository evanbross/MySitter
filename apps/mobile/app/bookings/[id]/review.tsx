import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/apiClient";

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      apiClient.reviews.createForBooking(id, { rating, body: body || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      router.back();
    },
    onError: (err) =>
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to submit review"),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leave a Review</Text>

      <Text style={styles.label}>Rating</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={[styles.star, n <= rating && styles.starFilled]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Comments (optional)</Text>
      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={4}
        placeholder="Describe your experience…"
        style={styles.textarea}
      />

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={() => submit.mutate()}
        disabled={submit.isPending}
      >
        <Text style={styles.submitBtnText}>
          {submit.isPending ? "Submitting…" : "Submit Review"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 24, color: "#111" },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  stars: { flexDirection: "row", gap: 8, marginBottom: 20 },
  star: { fontSize: 32, color: "#d1d5db" },
  starFilled: { color: "#f59e0b" },
  textarea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 24,
    fontFamily: "System",
  },
  submitBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
