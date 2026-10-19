/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { expect, test } from "@playwright/test";
import { registerUserViaApi } from "./fixtures/auth";

const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:8000";

test("register as customer", async ({ page }) => {
  const email = `register_customer_${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByPlaceholder("Display name").fill("Test Customer");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("LoadTest1!");
  await page.locator("select").selectOption("CUSTOMER");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const token = await page.evaluate(() => localStorage.getItem("access_token"));
  expect(token).toBeTruthy();

  const meResponse = await page.request.get(`${API_BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(meResponse.ok()).toBeTruthy();
  const me = (await meResponse.json()) as { email: string };
  expect(me.email).toBe(email);
});

test("login with wrong password", async ({ page, request }) => {
  const user = await registerUserViaApi(request, "CUSTOMER");

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(user.email);
  await page.getByPlaceholder("Password").fill("wrong-password");

  const loginResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/auth/login") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: "Sign in" }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status()).toBe(401);
  await expect(page.getByText("Invalid credentials")).toBeVisible();
});

test("login with correct credentials", async ({ page, request }) => {
  const user = await registerUserViaApi(request, "CUSTOMER");

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(user.email);
  await page.getByPlaceholder("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
