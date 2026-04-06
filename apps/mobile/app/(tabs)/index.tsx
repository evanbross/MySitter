import { View, Text, StyleSheet } from "react-native";

// TODO Phase 1: map-based search, provider cards, filter by service type
export default function SearchTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find a Sitter</Text>
      <Text>Search coming in Phase 1.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
});
