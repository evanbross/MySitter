import { View, Text, StyleSheet } from "react-native";

// TODO Phase 2: conversation list + real-time chat
export default function MessagesTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <Text>Coming in Phase 2.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
});
