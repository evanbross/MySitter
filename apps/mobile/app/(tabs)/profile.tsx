import { View, Text, Button, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

export default function ProfileTab() {
  const router = useRouter();

  function handleSignOut() {
    SecureStore.deleteItemAsync("access_token");
    router.replace("/auth/login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
});
