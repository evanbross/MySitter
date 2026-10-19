/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function Index() {
  const token = SecureStore.getItem("access_token");
  return <Redirect href={token ? "/(tabs)" : "/auth/login"} />;
}
