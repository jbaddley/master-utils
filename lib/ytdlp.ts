import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execAsync = promisify(execFile);

const SYSTEM_PATHS = ["/usr/local/bin/yt-dlp", "/usr/bin/yt-dlp"];

function findBin(): string {
  for (const p of SYSTEM_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "yt-dlp not found. It is installed automatically during deployment."
  );
}

// ── Cookies file (Netscape format) ──────────────────────────────────────────

const COOKIES_PATH = path.join(os.tmpdir(), "yt-cookies.txt");
let _cookiesReady = false;

export async function ytdlpCookiesArgs(): Promise<string[]> {
  if (!process.env.YOUTUBE_COOKIES) return [];

  if (!_cookiesReady) {
    try {
      const raw: { name: string; value: string; domain: string; path?: string }[] =
        JSON.parse(process.env.YOUTUBE_COOKIES);

      const lines = ["# Netscape HTTP Cookie File"];
      for (const c of raw) {
        const domain = c.domain.startsWith(".")
          ? c.domain
          : `.${c.domain.replace(/^www\./, "")}`;
        const secure = c.name.startsWith("__Secure-") ? "TRUE" : "FALSE";
        lines.push(
          [domain, "TRUE", c.path ?? "/", secure, "0", c.name, c.value].join("\t")
        );
      }
      await mkdir(path.dirname(COOKIES_PATH), { recursive: true });
      await writeFile(COOKIES_PATH, lines.join("\n"));
      _cookiesReady = true;
    } catch {
      return [];
    }
  }

  return ["--cookies", COOKIES_PATH];
}

// ── JSON metadata ────────────────────────────────────────────────────────────

export async function ytdlpJson(url: string): Promise<Record<string, unknown>> {
  const cookieArgs = await ytdlpCookiesArgs();
  const { stdout } = await execAsync(
    findBin(),
    [
      "--dump-single-json", "--no-warnings", "--no-playlist",
      "--no-check-formats", // don't validate format availability, just return all metadata
      ...cookieArgs,
      url,
    ],
    { maxBuffer: 20 * 1024 * 1024, timeout: 25_000 }
  );
  return JSON.parse(stdout) as Record<string, unknown>;
}

export function ytdlpBin(): string {
  return findBin();
}
