import { View, Text, StyleSheet } from "react-native";

// TODO Phase 1: booking list with status badges, confirm/cancel actions
export default function BookingsTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Bookings</Text>
      <Text>Coming in Phase 1.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
});
