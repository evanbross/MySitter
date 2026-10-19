/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { expect, test, type Page } from "@playwright/test";
import {
  CUSTOMER_STORAGE_STATE_PATH,
  PROVIDER_STORAGE_STATE_PATH,
} from "./fixtures/auth";

const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:8000";

async function getFirstProviderId(page: Page): Promise<string | null> {
  const response = await page.request.get(`${API_BASE_URL}/providers/search`, {
    params: { lat: 40.7128, lng: -74.006, radius_miles: 25, page: 1 },
  });
  if (!response.ok()) return null;
  const body = (await response.json()) as { items?: Array<{ id: string }> };
  return body.items?.[0]?.id ?? null;
}

test.describe("booking", () => {
  test.use({ storageState: CUSTOMER_STORAGE_STATE_PATH });

  test("provider profile page shows booking form for customers", async ({ page }) => {
    const providerId = await getFirstProviderId(page);
    test.skip(!providerId, "No provider data available in test environment.");

    await page.goto(`/providers/${providerId}`);
    await page.getByRole("button", { name: "Book this sitter" }).click();

    await expect(page.getByText("Service type")).toBeVisible();
    await expect(page.getByText("Start")).toBeVisible();
    await expect(page.getByText("End")).toBeVisible();

    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const toLocal = (value: Date) => value.toISOString().slice(0, 16);

    await page.getByLabel("Start").fill(toLocal(start));
    await page.getByLabel("End").fill(toLocal(end));
    await page.getByLabel("Service type").selectOption("PET_SITTING");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(page).toHaveURL(/\/bookings$/);
  });
});

test.describe("provider own profile", () => {
  test.use({ storageState: PROVIDER_STORAGE_STATE_PATH });

  test("provider cannot see booking form on own profile", async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    expect(token).toBeTruthy();

    const myProfile = await page.request.get(`${API_BASE_URL}/providers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(myProfile.ok()).toBeTruthy();
    const profile = (await myProfile.json()) as { id: string };

    await page.goto(`/providers/${profile.id}`);
    await expect(page.getByRole("button", { name: "Book this sitter" })).toHaveCount(0);
  });
});
