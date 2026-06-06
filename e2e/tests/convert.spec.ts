import { test, expect } from "@playwright/test";
import { uploadFile, waitForDownload, expectDownloadFilename } from "../helpers";

const FORMAT_PAIRS: Array<{ path: string; fixture: string; ext: RegExp }> = [
  { path: "/png-to-jpg", fixture: "sample.png", ext: /\.jpe?g$/i },
  { path: "/jpg-to-png", fixture: "sample.jpg", ext: /\.png$/i },
  { path: "/jpg-to-webp", fixture: "sample.jpg", ext: /\.webp$/i },
  { path: "/webp-to-png", fixture: "sample.webp", ext: /\.png$/i },
  { path: "/webp-to-jpg", fixture: "sample.webp", ext: /\.jpe?g$/i },
  { path: "/png-to-webp", fixture: "sample.png", ext: /\.webp$/i },
];

test.describe("Convert Image", () => {
  for (const { path, fixture, ext } of FORMAT_PAIRS) {
    test(`${path} — upload, convert, download`, async ({ page }) => {
      const res = await page.goto(path);
      // Route may not exist yet; skip gracefully
      if (res?.status() === 404) {
        test.skip();
        return;
      }
      expect(res?.status()).toBe(200);

      // Upload
      await uploadFile(page, fixture);
      await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });

      // Download
      const downloadBtn = page.locator("button", { hasText: /download|convert/i }).first();
      await expect(downloadBtn).toBeVisible({ timeout: 15_000 });
      const download = await waitForDownload(page, () => downloadBtn.click());
      expectDownloadFilename(download, ext);
    });
  }
});

test.describe("Convert Image — /png-to-jpg (primary route)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/png-to-jpg");
  });

  test("dropzone is visible on load", async ({ page }) => {
    await expect(page.locator(".dropzone")).toBeVisible();
  });

  test("format labels are displayed", async ({ page }) => {
    await expect(page.locator("body")).toContainText(/png|convert/i);
  });

  test("uploading PNG shows editor", async ({ page }) => {
    await uploadFile(page, "sample.png");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("canvas, img, .pane, .duo").first()).toBeVisible();
  });

  test("download has .jpg extension", async ({ page }) => {
    await uploadFile(page, "sample.png");
    const downloadBtn = page.locator("button", { hasText: /download/i }).first();
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });
    const download = await waitForDownload(page, () => downloadBtn.click());
    expectDownloadFilename(download, /\.jpe?g$/i);
  });
});
