import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function Index() {
  const token = SecureStore.getItem("access_token");
  return <Redirect href={token ? "/(tabs)" : "/auth/login"} />;
}
