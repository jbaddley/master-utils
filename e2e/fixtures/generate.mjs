/**
 * Generates minimal test fixture images using the sharp library (already a
 * project dependency). Run once: `node e2e/fixtures/generate.mjs`
 */
import sharp from "sharp";
import { writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const out = (name) => resolve(__dir, name);

// Helper: raw RGBA pixel buffer
function solid(w, h, r, g, b, a = 255) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4 + 0] = r;
    buf[i * 4 + 1] = g;
    buf[i * 4 + 2] = b;
    buf[i * 4 + 3] = a;
  }
  return buf;
}

// Gradient: top-left red → bottom-right blue
function gradient(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      buf[i + 0] = Math.round((x / w) * 255);
      buf[i + 1] = 100;
      buf[i + 2] = Math.round((y / h) * 255);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

// solid white background with a red square in the center (for bg removal)
function solidWhiteWithRed(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inSquare = Math.abs(x - cx) < r && Math.abs(y - cy) < r;
      buf[i + 0] = inSquare ? 220 : 255;
      buf[i + 1] = inSquare ? 50 : 255;
      buf[i + 2] = inSquare ? 50 : 255;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

async function make(filename, pixelsBuf, w, h, fmt, opts = {}) {
  const img = sharp(pixelsBuf, { raw: { width: w, height: h, channels: 4 } });
  if (fmt === "jpeg") await img.jpeg({ quality: 90, ...opts }).toFile(out(filename));
  else if (fmt === "png") await img.png(opts).toFile(out(filename));
  else if (fmt === "webp") await img.webp({ quality: 85, ...opts }).toFile(out(filename));
  console.log(`✓ ${filename}`);
}

await make("sample.jpg", gradient(800, 600), 800, 600, "jpeg");
await make("sample.png", gradient(800, 600), 800, 600, "png");
await make("sample.webp", gradient(800, 600), 800, 600, "webp");
await make("sample-large.jpg", gradient(3000, 2000), 3000, 2000, "jpeg");
await make("sample-small.jpg", gradient(200, 150), 200, 150, "jpeg");
await make("solid-bg.png", solidWhiteWithRed(400, 300), 400, 300, "png");
await make("solid-bg.jpg", solidWhiteWithRed(400, 300), 400, 300, "jpeg");

// A transparent PNG (for format conversion tests)
const transparentBuf = Buffer.alloc(200 * 200 * 4, 0);
for (let i = 0; i < 200 * 200; i++) {
  transparentBuf[i * 4 + 0] = 100;
  transparentBuf[i * 4 + 1] = 149;
  transparentBuf[i * 4 + 2] = 237;
  transparentBuf[i * 4 + 3] = i < 200 * 100 ? 255 : 128; // half transparent
}
await make("transparent.png", transparentBuf, 200, 200, "png");

console.log("All fixtures generated.");
