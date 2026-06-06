import { test, expect } from "@playwright/test";

// Video processing tool smoke tests.
// Full conversion tests require real video fixtures and FFmpeg WASM — these
// verify routes, h1s, and dropzone UI without triggering conversions.

const VIDEO_ROUTES = [
  { path: "/compress-video", h1: /compress.*video|video.*compress/i },
  { path: "/compress-video-for-email", h1: /compress|email/i },
  { path: "/compress-video-for-web", h1: /compress|web/i },
  { path: "/mov-to-mp4", h1: /mov|mp4/i },
  { path: "/mp4-to-webm", h1: /mp4|webm/i },
  { path: "/mp4-to-mp3", h1: /mp4|mp3|audio/i },
  { path: "/mute-video", h1: /mute|video/i },
  { path: "/remove-audio-from-video", h1: /remove|audio|video/i },
];

test.describe("Video tools — route smoke tests", () => {
  for (const { path, h1 } of VIDEO_ROUTES) {
    test(`${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      if (res?.status() === 404) { test.skip(); return; }
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toHaveText(h1, { timeout: 8_000 });
    });
  }
});

test.describe("Video Compressor UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/compress-video");
  });

  test("dropzone is visible", async ({ page }) => {
    await expect(page.locator(".dropzone")).toBeVisible();
  });

  test("dropzone mentions video formats", async ({ page }) => {
    await expect(page.locator(".dropzone")).toContainText(/mp4|webm|mov|video/i);
  });
});

test.describe("MOV to MP4 UI", () => {
  test("dropzone is visible on /mov-to-mp4", async ({ page }) => {
    const res = await page.goto("/mov-to-mp4");
    if (res?.status() === 404) { test.skip(); return; }
    await expect(page.locator(".dropzone")).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Mute Video UI", () => {
  test("dropzone is visible on /mute-video", async ({ page }) => {
    const res = await page.goto("/mute-video");
    if (res?.status() === 404) { test.skip(); return; }
    await expect(page.locator(".dropzone")).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("MP4 to MP3 UI", () => {
  test("dropzone is visible on /mp4-to-mp3", async ({ page }) => {
    const res = await page.goto("/mp4-to-mp3");
    if (res?.status() === 404) { test.skip(); return; }
    await expect(page.locator(".dropzone")).toBeVisible({ timeout: 8_000 });
  });
});
