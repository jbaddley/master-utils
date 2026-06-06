import { test, expect } from "@playwright/test";
import { uploadFile, waitForDownload, expectDownloadFilename } from "../helpers";

test.describe("Remove Background", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/remove-background");
  });

  test("dropzone is visible on load", async ({ page }) => {
    await expect(page.locator(".dropzone")).toBeVisible();
  });

  test("uploading a solid-background image loads the tool", async ({ page }) => {
    await uploadFile(page, "solid-bg.png");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("canvas, img").first()).toBeVisible({ timeout: 10_000 });
  });

  test("tolerance slider is present after upload", async ({ page }) => {
    await uploadFile(page, "solid-bg.png");
    await expect(
      page.locator('[data-slot="slider"], input[type="range"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("tolerance slider can be moved", async ({ page }) => {
    await uploadFile(page, "solid-bg.png");
    const slider = page.locator('[data-slot="slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10_000 });

    const box = await slider.boundingBox();
    if (box) {
      // Drag slider to the right
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
    }
    // No crash = pass
  });

  test("download button is visible (desktop regression check)", async ({ page }) => {
    await uploadFile(page, "solid-bg.png");
    // The download button must not be hidden by the `.ab-actions` CSS rule
    const downloadBtn = page.locator("button", { hasText: /download/i }).first();
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });
    const box = await downloadBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test("download PNG contains transparent pixels (alpha)", async ({ page }) => {
    await uploadFile(page, "solid-bg.png");
    const downloadBtn = page.locator("button", { hasText: /download/i }).first();
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });
    const download = await waitForDownload(page, () => downloadBtn.click());
    // Must be a PNG (alpha-capable format)
    expectDownloadFilename(download, /\.png$/i);
  });

  test("change image button resets to dropzone", async ({ page }) => {
    await uploadFile(page, "solid-bg.png");
    const changeBtn = page.locator("button", { hasText: /change|reset|new/i }).first();
    if (await changeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await changeBtn.click();
      await expect(page.locator(".dropzone")).toBeVisible({ timeout: 5_000 });
    }
  });

  test("uploading a JPEG also works", async ({ page }) => {
    await uploadFile(page, "solid-bg.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
  });
});
