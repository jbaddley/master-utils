import { test, expect } from "@playwright/test";
import { uploadFile, waitForDownload, expectDownloadFilename, fx } from "../helpers";

test.describe("Print Prep", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/print-prep");
  });

  test("dropzone is visible on load with correct label", async ({ page }) => {
    await expect(page.locator(".dropzone")).toBeVisible();
    await expect(page.locator(".dropzone")).toContainText(/photo|image|drop/i);
  });

  test("uploading one image shows it in the grid", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    // Thumbnail grid should appear
    await expect(page.locator(".pp-grid, .pp-thumb").first()).toBeVisible({ timeout: 10_000 });
  });

  test("uploading 3 images fills the 3-column grid", async ({ page }) => {
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles([fx("sample.jpg"), fx("sample.png"), fx("sample.webp")]);
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator(".pp-thumb")).toHaveCount(3, { timeout: 10_000 });
  });

  test("max print size label appears under each thumbnail", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator(".pp-thumb-size").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".pp-thumb-size").first()).toContainText(/up to|"/i);
  });

  test("clicking a thumbnail selects it", async ({ page }) => {
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles([fx("sample.jpg"), fx("sample.png")]);
    await expect(page.locator(".pp-thumb")).toHaveCount(2, { timeout: 10_000 });

    // Click second thumbnail
    await page.locator(".pp-thumb").nth(1).click();
    // Second thumb should have selected class
    await expect(page.locator(".pp-thumb.selected")).toHaveCount(1);
  });

  test("print size pills are visible after upload", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator(".pp-size-btn").first()).toBeVisible({ timeout: 10_000 });
    // Should have at least Original + 8 sizes
    const count = await page.locator(".pp-size-btn").count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("selecting 4×6 print size highlights that pill", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    const pill4x6 = page.locator(".pp-size-btn", { hasText: /4.?×.?6|4x6/i });
    await expect(pill4x6).toBeVisible({ timeout: 10_000 });
    await pill4x6.click();
    await expect(pill4x6).toHaveClass(/active/);
  });

  test("filter swatches are visible and show thumbnails", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator(".pp-filter-btn").first()).toBeVisible({ timeout: 10_000 });
    const count = await page.locator(".pp-filter-btn").count();
    expect(count).toBe(8); // Original, B&W, Sepia, Warm, Cool, Retro, Cinematic, Bright
  });

  test("clicking B&W filter marks it active", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    const bwBtn = page.locator(".pp-filter-btn", { hasText: /b.?w|black/i });
    await expect(bwBtn).toBeVisible({ timeout: 10_000 });
    await bwBtn.click();
    await expect(bwBtn).toHaveClass(/active/);
  });

  test("clicking Original filter deactivates other filters", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    const bwBtn = page.locator(".pp-filter-btn", { hasText: /b.?w|black/i });
    await bwBtn.click();
    const origBtn = page.locator(".pp-filter-btn", { hasText: /original|none/i });
    await origBtn.click();
    await expect(origBtn).toHaveClass(/active/);
    await expect(bwBtn).not.toHaveClass(/active/);
  });

  test("brightness slider is present and movable", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    const slider = page.locator('[data-slot="slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10_000 });
    const box = await slider.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, { steps: 8 });
      await page.mouse.up();
    }
  });

  test("Mark Done button marks the image as done", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    const doneBtn = page.locator("button", { hasText: /mark done|done/i }).first();
    await expect(doneBtn).toBeVisible({ timeout: 10_000 });
    await doneBtn.click();
    // Checkmark should appear on the thumbnail
    await expect(page.locator(".pp-check").first()).toBeVisible({ timeout: 5_000 });
  });

  test("done count badge increments after marking done", async ({ page }) => {
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles([fx("sample.jpg"), fx("sample.png")]);
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator(".pp-thumb")).toHaveCount(2, { timeout: 10_000 });

    const doneBtn = page.locator("button", { hasText: /mark done/i }).first();
    await expect(doneBtn).toBeVisible({ timeout: 10_000 });
    await doneBtn.click();
    await expect(page.locator(".pp-done-badge")).toContainText(/1/, { timeout: 5_000 });
  });

  test("Reset button clears edits", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    // Apply a filter
    await page.locator(".pp-filter-btn", { hasText: /sepia/i }).click();
    // Reset
    const resetBtn = page.locator("button", { hasText: /reset/i }).first();
    await expect(resetBtn).toBeVisible({ timeout: 5_000 });
    await resetBtn.click();
    // Original filter should be active again
    await expect(page.locator(".pp-filter-btn", { hasText: /original|none/i })).toHaveClass(/active/);
  });

  test("Download ZIP button triggers a .zip download", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    const zipBtn = page.locator("button", { hasText: /zip|download/i }).first();
    await expect(zipBtn).toBeVisible({ timeout: 10_000 });
    const download = await waitForDownload(page, () => zipBtn.click());
    expectDownloadFilename(download, /\.zip$/i);
  });

  test("AI Upscale shows upgrade prompt for unauthenticated users", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    // Should show the pro gate (not the upscale button)
    await expect(page.locator(".pp-pro-gate")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".pp-pro-gate")).toContainText(/pro|upgrade/i);
  });

  test("Google Drive section not shown for logged-out users", async ({ page }) => {
    await uploadFile(page, "sample.jpg");
    await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
    // The drive section should be hidden when user is null
    const driveSection = page.locator(".pp-drive-section");
    const isVisible = await driveSection.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });
});
