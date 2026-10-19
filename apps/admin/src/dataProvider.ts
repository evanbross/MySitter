/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import simpleRestProvider from "ra-data-simple-rest";

// ra-data-simple-rest handles Content-Range headers automatically.
// The base URL must point at the FastAPI admin prefix.
export const dataProvider = simpleRestProvider(
  import.meta.env.VITE_API_URL + "/admin",
  // Custom httpClient to inject the JWT from localStorage
  async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("access_token");
    const headers = new Headers(options.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url, { ...options, headers });

    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }

    return {
      status: response.status,
      headers: response.headers,
      body: text,
      json,
    };
  }
);
