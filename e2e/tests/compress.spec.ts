import { test, expect } from "@playwright/test";
import { uploadFile, waitForDownload, expectDownloadFilename } from "../helpers";

test.describe("Compress Image", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/compress-image");
  });

  test("dropzone is visible on load", async ({ page }) => {
    await expect(page.locator(".dropzone")).toBeVisible();
    await expect(page.locator(".dropzone")).toContainText(/drop|image|click/i);
  });

  test("uploading a JPEG shows the editor", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    // Some kind of output / comparison panel should be visible
    await expect(page.locator("canvas, img, .pane, .duo").first()).toBeVisible();
  });

  test("format selector is present after upload", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator("select, [role='combobox']").first()).toBeVisible({ timeout: 10_000 });
  });

  test("quality slider is visible for JPEG", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator('[data-slot="slider"], input[type="range"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("download button triggers a file download", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    const downloadBtn = page.locator("button", { hasText: /download/i }).first();
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });
    const download = await waitForDownload(page, () => downloadBtn.click());
    expectDownloadFilename(download, /\.(jpe?g|png|webp)$/i);
  });

  test("uploading a PNG works", async ({ page }) => {
    await uploadFile(page, "sample.png");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
  });

  test("uploading a WebP works", async ({ page }) => {
    await uploadFile(page, "sample.webp");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
  });
});

test.describe("Compress Image — variant routes", () => {
  const variants = [
    { path: "/compress-image-for-web", title: /compress.*web/i },
    { path: "/compress-image-for-shopify", title: /compress.*shopify/i },
    { path: "/compress-image-for-wordpress", title: /compress.*wordpress/i },
  ];

  for (const { path, title } of variants) {
    test(`${path} loads with correct h1`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toHaveText(title, { timeout: 8_000 });
    });
  }
});

test.describe("Batch Compress", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/batch-compress");
  });

  test("dropzone accepts multiple files", async ({ page }) => {
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles([
      require("../helpers").fx("sample.jpg"),
      require("../helpers").fx("sample.png"),
      require("../helpers").fx("sample.webp"),
    ]);
    // Should show file entries (.batch-file-row is the actual CSS class)
    const fileRows = page.locator(".batch-file-row, .batch-file-name").filter({ hasText: /sample/i });
    await expect(fileRows.first()).toBeVisible({ timeout: 10_000 });
  });

  test("ZIP download button triggers a download", async ({ page }) => {
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles([
      require("../helpers").fx("sample.jpg"),
      require("../helpers").fx("sample.png"),
    ]);
    const downloadBtn = page.locator("button", { hasText: /zip|download all/i }).first();
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });
    const download = await waitForDownload(page, () => downloadBtn.click());
    expectDownloadFilename(download, /\.zip$/i);
  });
});
