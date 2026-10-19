/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { expect, test } from "@playwright/test";
import {
  CUSTOMER_STORAGE_STATE_PATH,
  PROVIDER_STORAGE_STATE_PATH,
} from "./fixtures/auth";

test.describe("calendar page", () => {
  test("renders for provider", async ({ browser }) => {
    const context = await browser.newContext({ storageState: PROVIDER_STORAGE_STATE_PATH });
    const page = await context.newPage();
    await page.goto("/calendar");
    await expect(page.locator(".fc").first()).toBeVisible();
    await context.close();
  });

  test("renders booking schedule for customer", async ({ browser }) => {
    const context = await browser.newContext({ storageState: CUSTOMER_STORAGE_STATE_PATH });
    const page = await context.newPage();
    await page.goto("/calendar");
    await expect(page.locator(".fc").first()).toBeVisible();
    await context.close();
  });
});
