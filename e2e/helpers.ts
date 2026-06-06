import { type Page, type Download, type Locator, expect } from "@playwright/test";
import path from "path";

export const FIXTURES = path.resolve(__dirname, "fixtures");
export const fx = (name: string) => path.join(FIXTURES, name);

// ── File upload ───────────────────────────────────────────────────────────────

/**
 * Upload a file by setting it on the first hidden file input found inside
 * `container` (defaults to the whole page). Works for both the Dropzone
 * component (which hides its <input type="file">) and visible inputs.
 */
export async function uploadFile(
  page: Page,
  fixtureName: string,
  container: Locator | Page = page,
): Promise<void> {
  const input = (container as Locator).locator
    ? (container as Locator).locator('input[type="file"]').first()
    : (page as Page).locator('input[type="file"]').first();
  await input.setInputFiles(fx(fixtureName));
}

/**
 * Upload multiple files at once.
 */
export async function uploadFiles(
  page: Page,
  fixtureNames: string[],
  container: Locator | Page = page,
): Promise<void> {
  const input = (container as Locator).locator
    ? (container as Locator).locator('input[type="file"]').first()
    : (page as Page).locator('input[type="file"]').first();
  await input.setInputFiles(fixtureNames.map(fx));
}

/**
 * Simulate dropping a file onto a dropzone element.
 */
export async function dropFile(
  page: Page,
  dropzoneSelector: string,
  fixtureName: string,
): Promise<void> {
  const filePath = fx(fixtureName);
  const fileContent = require("fs").readFileSync(filePath);
  const mimeType = fixtureName.endsWith(".jpg") || fixtureName.endsWith(".jpeg")
    ? "image/jpeg"
    : fixtureName.endsWith(".png") ? "image/png"
    : fixtureName.endsWith(".webp") ? "image/webp"
    : fixtureName.endsWith(".mp4") ? "video/mp4"
    : fixtureName.endsWith(".mp3") ? "audio/mpeg"
    : "application/octet-stream";

  await page.dispatchEvent(dropzoneSelector, "dragenter");
  await page.dispatchEvent(dropzoneSelector, "dragover");
  await page.evaluate(
    ({ selector, base64, name, mime }) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const file = new File([bytes], name, { type: mime });
      const dt = new DataTransfer();
      dt.items.add(file);
      el.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true }));
    },
    {
      selector: dropzoneSelector,
      base64: fileContent.toString("base64"),
      name: fixtureName,
      mime: mimeType,
    },
  );
}

// ── Download ──────────────────────────────────────────────────────────────────

/**
 * Wait for a download triggered by `action`. Returns the Download object.
 *
 * Removes `showSaveFilePicker` from the page so the app falls back to the
 * blob-URL anchor approach, which Playwright can intercept as a download event.
 * (The native File System Access dialog is OS-level and cannot be automated.)
 */
export async function waitForDownload(
  page: Page,
  action: () => Promise<void>,
): Promise<Download> {
  await page.evaluate(() => {
    delete (window as unknown as Record<string, unknown>).showSaveFilePicker;
  });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    action(),
  ]);
  return download;
}

/**
 * Assert the download filename matches a string or regex.
 */
export function expectDownloadFilename(
  download: Download,
  pattern: string | RegExp,
): void {
  const name = download.suggestedFilename();
  if (typeof pattern === "string") {
    expect(name).toContain(pattern);
  } else {
    expect(name).toMatch(pattern);
  }
}

// ── Common waits ──────────────────────────────────────────────────────────────

/**
 * Wait for a dropzone to disappear (i.e. file was accepted and the tool loaded).
 */
export async function waitForToolLoaded(page: Page): Promise<void> {
  await expect(page.locator(".dropzone")).toBeHidden({ timeout: 15_000 });
}

/**
 * Wait for the editor / main tool content to appear after upload.
 * Falls back to waiting for the dropzone to be gone.
 */
export async function waitForEditor(page: Page, selector = ".tool-ui"): Promise<void> {
  await expect(page.locator(selector)).toBeVisible({ timeout: 15_000 });
}
