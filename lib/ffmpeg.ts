import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let cached: FFmpeg | null = null;

/** Load and return a shared FFmpeg instance (loads once, reuses thereafter). */
export async function loadFFmpeg(): Promise<FFmpeg> {
  if (cached?.loaded) return cached;
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript"),
    wasmURL: await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
  });
  cached = ffmpeg;
  return ffmpeg;
}

export function formatFFmpegLoadError(e: unknown): string {
  if (e instanceof Error) return `Failed to load ffmpeg: ${e.message}`;
  return "Failed to load ffmpeg. Your browser may not support WebAssembly.";
}
