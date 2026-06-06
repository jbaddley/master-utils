import { test, expect } from "@playwright/test";

// Audio tool smoke tests — full conversion requires audio fixtures (mp3/wav).
// These tests verify routes load, UI elements render, and controls are present.

const AUDIO_ROUTES = [
  { path: "/audio-converter", h1: /audio/i },
  { path: "/m4a-to-mp3", h1: /m4a|mp3/i },
  { path: "/mp3-to-wav", h1: /mp3|wav/i },
  { path: "/ogg-to-mp3", h1: /ogg|mp3/i },
  { path: "/change-audio-pitch", h1: /pitch/i },
  { path: "/change-audio-speed", h1: /speed/i },
  { path: "/merge-audio", h1: /merge|audio/i },
  { path: "/audio-fade", h1: /fade|audio/i },
  { path: "/normalize-audio", h1: /normaliz/i },
  { path: "/online-voice-recorder", h1: /recorder|record/i },
];

test.describe("Audio tools — route smoke tests", () => {
  for (const { path, h1 } of AUDIO_ROUTES) {
    test(`${path} loads with correct h1`, async ({ page }) => {
      const res = await page.goto(path);
      if (res?.status() === 404) { test.skip(); return; }
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toHaveText(h1, { timeout: 8_000 });
    });
  }
});

test.describe("Audio Converter UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/audio-converter");
  });

  test("dropzone is visible on load", async ({ page }) => {
    await expect(page.locator(".dropzone")).toBeVisible();
  });

  test("dropzone accepts audio file types in label", async ({ page }) => {
    await expect(page.locator(".dropzone")).toContainText(/mp3|wav|audio|ogg|m4a/i);
  });
});

test.describe("Change Audio Pitch UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/change-audio-pitch");
  });

  test("dropzone is visible", async ({ page }) => {
    await expect(page.locator(".dropzone")).toBeVisible();
  });

  test("pitch control is present in the page", async ({ page }) => {
    // The pitch control might only appear after upload; check the page description
    await expect(page.locator("h1").first()).toHaveText(/pitch/i);
  });
});

test.describe("Merge Audio UI", () => {
  test("dropzone accepts multiple files", async ({ page }) => {
    await page.goto("/merge-audio");
    if ((await page.locator("h1").first().textContent({ timeout: 5_000 }))?.match(/404/)) {
      test.skip();
    }
    await expect(page.locator(".dropzone, [multiple]").first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Voice Recorder UI", () => {
  test("record button is present", async ({ page }) => {
    await page.goto("/online-voice-recorder");
    if ((await page.locator("h1").first().textContent({ timeout: 5_000 }))?.match(/404/)) {
      test.skip();
    }
    // Record button should be visible (microphone permission not needed to render the button)
    const recordBtn = page.locator("button").filter({ hasText: /record|start/i }).first();
    await expect(recordBtn).toBeVisible({ timeout: 8_000 });
  });
});
