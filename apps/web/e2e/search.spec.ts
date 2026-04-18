import { expect, test } from "@playwright/test";
import { CUSTOMER_STORAGE_STATE_PATH } from "./fixtures/auth";

test.use({ storageState: CUSTOMER_STORAGE_STATE_PATH });

test.describe("search page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/search");
  });

  test("loads and shows map", async ({ page }) => {
    await expect(page.locator(".mapboxgl-canvas")).toBeVisible();
    await expect(page.getByText("Service type")).toBeVisible();
  });

  test("provider card links to profile", async ({ page }) => {
    const providerCards = page.locator("div").filter({ hasText: /mi away/ });
    const count = await providerCards.count();
    test.skip(count === 0, "No provider data available in test environment.");

    const firstCard = providerCards.first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/providers\/.+/);
  });
});
