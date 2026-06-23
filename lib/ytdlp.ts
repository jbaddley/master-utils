import { existsSync } from "fs";
import { writeFile, unlink, mkdir } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomBytes } from "crypto";
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

// ── Cookies (Netscape format) ────────────────────────────────────────────────
// Write a FRESH file per call so yt-dlp can't overwrite our auth cookies.
// yt-dlp writes tracking cookies back to the --cookies file, which would
// clobber __Secure-1PSID / SAPISID / LOGIN_INFO if we reuse a single path.

function buildCookieLines(): string | null {
  if (!process.env.YOUTUBE_COOKIES) return null;
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
    return lines.join("\n");
  } catch {
    return null;
  }
}

const COOKIE_CONTENT = buildCookieLines();

async function writeFreshCookies(): Promise<string | null> {
  if (!COOKIE_CONTENT) return null;
  const p = path.join(os.tmpdir(), `yt-cookies-${randomBytes(6).toString("hex")}.txt`);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, COOKIE_CONTENT);
  return p;
}

// ── JSON metadata ────────────────────────────────────────────────────────────

export async function ytdlpJson(url: string): Promise<Record<string, unknown>> {
  const cookiesFile = await writeFreshCookies();
  const cookieArgs = cookiesFile ? ["--cookies", cookiesFile] : [];
  try {
    const { stdout } = await execAsync(
      findBin(),
      [
        "--dump-single-json", "--no-warnings", "--no-playlist",
        "--no-check-formats",
        ...cookieArgs,
        url,
      ],
      { maxBuffer: 20 * 1024 * 1024, timeout: 25_000 }
    );
    return JSON.parse(stdout) as Record<string, unknown>;
  } finally {
    if (cookiesFile) unlink(cookiesFile).catch(() => {});
  }
}

export async function ytdlpCookiesArgs(): Promise<string[]> {
  const p = await writeFreshCookies();
  return p ? ["--cookies", p] : [];
}

export function ytdlpBin(): string {
  return findBin();
}
