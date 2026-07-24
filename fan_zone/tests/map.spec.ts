import { expect, test } from "@playwright/test";

test("desktop live Google 3D map renders and its view controls work", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fan Zone · DC" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Healthy Hikers" })).toBeVisible();
  await expect(page.locator('[data-map-provider="google-maps-3d"]')).toBeVisible();
  await expect(page.locator("gmp-map-3d")).toBeAttached({ timeout: 20_000 });
  await page.waitForTimeout(7_000);

  await page.getByRole("button", { name: "From Metro", exact: true }).click();
  await expect(page.getByText("Walk north from Federal Center SW")).toBeVisible();
  await expect(page.getByText("401 3rd Street SW · Blue, Orange and Silver lines")).toBeVisible();

  await page.getByRole("button", { name: "Accessibility", exact: true }).click();
  await expect(page.getByText("Prefer the level south approach")).toBeVisible();

  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByText("The lawn in context")).toBeVisible();
  await page.waitForTimeout(1_200);
  await page.screenshot({ path: "/tmp/fan-zone-desktop.png", fullPage: true });

  expect(consoleErrors).toEqual([]);
});

test("mobile map remains usable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("gmp-map-3d")).toBeAttached({ timeout: 20_000 });
  await page.waitForTimeout(7_000);
  await expect(page.locator(".info-list")).toBeHidden();
  await page.screenshot({ path: "/tmp/fan-zone-mobile-collapsed.png", fullPage: true });

  await page.getByRole("button", { name: "Show map details" }).click();
  await expect(page.locator(".info-list")).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/fan-zone-mobile-expanded.png", fullPage: true });
  await page.getByRole("button", { name: "Hide map details" }).click();
  await expect(page.locator(".info-list")).toBeHidden();

  await expect(page.getByRole("button", { name: "From Metro", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "From Metro", exact: true }).click();
  await expect(page.getByText("Walk north from Federal Center SW")).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await page.screenshot({ path: "/tmp/fan-zone-mobile.png", fullPage: true });
});
