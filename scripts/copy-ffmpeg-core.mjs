import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules", "@ffmpeg/core", "dist", "umd");
const destDir = join(root, "public", "ffmpeg");

const files = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

mkdirSync(destDir, { recursive: true });

for (const file of files) {
  const src = join(srcDir, file);
  const dest = join(destDir, file);
  if (!existsSync(src)) {
    console.error(`Missing ${src} — run npm install @ffmpeg/core`);
    process.exit(1);
  }
  copyFileSync(src, dest);
}

console.log(`Copied ffmpeg-core (${files.join(", ")}) → public/ffmpeg/`);
