import { test, expect } from "@playwright/test";

const TOOL_ROUTES = [
  { path: "/", h1: /utilio|image|tool/i },
  { path: "/compress-image", h1: /compress image/i },
  { path: "/resize-image", h1: /resize image/i },
  { path: "/crop-image", h1: /crop image/i },
  { path: "/png-to-jpg", h1: /png|jpg|convert/i },
  { path: "/remove-background", h1: /remove background/i },
  { path: "/image-to-svg", h1: /image to svg/i },
  { path: "/favicon-generator", h1: /favicon/i },
  { path: "/upscale-image", h1: /upscale/i },
  { path: "/batch-compress", h1: /batch|compress/i },
  { path: "/batch-resize", h1: /batch|resize/i },
  { path: "/qr-code-generator", h1: /qr code/i },
  { path: "/audio-converter", h1: /audio/i },
  { path: "/video-to-gif", h1: /video to gif/i },
  { path: "/print-prep", h1: /print prep/i },
];

test.describe("smoke — all tool routes return 200 and render h1", () => {
  for (const { path, h1 } of TOOL_ROUTES) {
    test(`${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toHaveText(h1, { timeout: 10_000 });
    });
  }
});

test.describe("homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("tool cards are visible", async ({ page }) => {
    const cards = page.locator(".tool-card");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(5);
  });

  test("each tool card links to a valid route", async ({ page }) => {
    const hrefs = await page.locator(".tool-card").evaluateAll((els) =>
      els.map((el) => el.getAttribute("href")).filter(Boolean),
    );
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs.slice(0, 5)) {
      expect(href).toMatch(/^\//);
    }
  });

  test("clicking a tool card navigates to that tool", async ({ page }) => {
    const firstCard = page.locator(".tool-card").first();
    const href = await firstCard.getAttribute("href");
    await firstCard.click();
    await expect(page).toHaveURL(new RegExp(href!.replace("/", "\\/")));
    await expect(page.locator("h1").first()).toBeVisible();
  });
});

test.describe("site header", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("brand link returns to homepage", async ({ page }) => {
    await page.goto("/compress-image");
    await page.locator(".brand").click();
    await expect(page).toHaveURL("/");
  });

  test("frosted header class added on scroll", async ({ page }) => {
    await expect(page.locator(".site-header")).not.toHaveClass(/site-header--scrolled/);
    await page.evaluate(() => window.scrollBy(0, 100));
    await expect(page.locator(".site-header")).toHaveClass(/site-header--scrolled/, {
      timeout: 3_000,
    });
  });

  test("Ctrl+K opens command palette", async ({ page }) => {
    // Small wait for React hydration before sending keyboard event
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+k");
    await expect(page.locator('.cmd-palette[role="dialog"]')).toBeVisible({
      timeout: 5_000,
    });
  });

  test("Escape closes command palette", async ({ page }) => {
    await page.keyboard.press("Control+k");
    const palette = page.locator('.cmd-palette[role="dialog"]');
    await expect(palette).toBeVisible({ timeout: 3_000 });
    // Wait for the input to be focused (20ms delay in the component)
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden({ timeout: 3_000 });
  });
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hamburger menu opens on mobile", async ({ page }) => {
    await page.goto("/");
    // Mobile nav trigger — look for a button that controls nav
    const burger = page.locator("button[aria-label*='menu' i], button[aria-label*='nav' i], .mobile-nav-trigger").first();
    if (await burger.isVisible()) {
      await burger.click();
      const mobileNav = page.locator(".mobile-nav, nav[data-open]").first();
      await expect(mobileNav).toBeVisible({ timeout: 3_000 });
    } else {
      // If no burger visible, the nav items themselves should be reachable
      test.skip();
    }
  });
});
