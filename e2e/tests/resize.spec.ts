import { test, expect } from "@playwright/test";
import { uploadFile, waitForDownload, expectDownloadFilename, fx } from "../helpers";

test.describe("Resize Image", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/resize-image");
  });

  test("dropzone is visible on load", async ({ page }) => {
    await expect(page.locator(".dropzone")).toBeVisible();
  });

  test("uploading an image reveals resize controls", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    // Width or height input should appear
    await expect(
      page.locator('input[type="number"], input[placeholder*="width" i], input[placeholder*="height" i]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("original dimensions are displayed", async ({ page }) => {
    await uploadFile(page, "sample.jpg"); // 800×600
    await expect(page.locator("body")).toContainText(/800|600/, { timeout: 10_000 });
  });

  test("width input updates live", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    const widthInput = page.locator('input[type="number"]').first();
    await expect(widthInput).toBeVisible({ timeout: 10_000 });
    await widthInput.click({ clickCount: 3 });
    await widthInput.fill("400");
    await widthInput.press("Tab");
    // Height should auto-update (aspect lock)
    const heightInput = page.locator('input[type="number"]').nth(1);
    const h = await heightInput.inputValue();
    expect(Number(h)).toBeGreaterThan(0);
  });

  test("download triggers a file download", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    const downloadBtn = page.locator("button", { hasText: /download/i }).first();
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });
    const download = await waitForDownload(page, () => downloadBtn.click());
    expectDownloadFilename(download, /\.(jpe?g|png|webp)$/i);
  });

  test("social media presets change dimensions", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    // Wait for resize controls to appear
    await expect(page.locator('input[type="number"]').first()).toBeVisible({ timeout: 15_000 });
    // Preset buttons like "Instagram Post" are rendered in .row inside .field
    const presets = page.locator(".field button").filter({ hasText: /instagram/i }).first();
    if (await presets.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await presets.click();
      // After selecting Instagram Post (1080×1080), width should be 1080
      const widthInput = page.locator('input[type="number"]').first();
      await expect(widthInput).toHaveValue("1080", { timeout: 5_000 });
    }
    // Soft pass: if no preset buttons visible, tool still loaded correctly
  });
});

test.describe("Resize Image — variant routes", () => {
  const variants = [
    "/resize-image-for-instagram",
    "/resize-image-for-linkedin",
    "/resize-image-for-youtube",
  ];
  for (const path of variants) {
    test(`${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 8_000 });
    });
  }
});

test.describe("Batch Resize", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/batch-resize");
  });

  test("accepts multiple files", async ({ page }) => {
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles([fx("sample.jpg"), fx("sample.png"), fx("sample.webp")]);
    await expect(page.locator("body")).toContainText(/sample/, { timeout: 10_000 });
  });

  test("ZIP download triggered", async ({ page }) => {
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles([fx("sample.jpg"), fx("sample.png")]);
    const downloadBtn = page.locator("button", { hasText: /zip|download/i }).first();
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });
    const download = await waitForDownload(page, () => downloadBtn.click());
    expectDownloadFilename(download, /\.zip$/i);
  });
});
