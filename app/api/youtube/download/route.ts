import type { NextRequest } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { createReadStream, unlink } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { ytdlpBin, ytdlpCookiesArgs } from "@/lib/ytdlp";

const execAsync = promisify(execFile);
const unlinkAsync = promisify(unlink);

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");
  const type = (searchParams.get("type") ?? "video") as "video" | "audio";
  const itag = searchParams.get("itag");

  if (!url) return Response.json({ error: "url required" }, { status: 400 });

  const ext = type === "audio" ? "m4a" : "mp4";
  const mime = type === "audio" ? "audio/mp4" : "video/mp4";
  const tmpFile = join(tmpdir(), `yt-${randomBytes(6).toString("hex")}.${ext}`);

  try {
    const [bin, cookieArgs] = await Promise.all([ytdlpBin(), ytdlpCookiesArgs()]);

    // Format selection — combined ≤720p streams don't require ffmpeg on the server
    let fmtArg: string;
    if (itag) {
      fmtArg = itag;
    } else if (type === "audio") {
      fmtArg = "bestaudio[ext=m4a]/bestaudio";
    } else {
      // Prefer pre-merged MP4 (format 22 = 720p, 18 = 360p) to avoid needing ffmpeg
      fmtArg = "best[ext=mp4][height<=720]/best[height<=720]";
    }

    await execAsync(
      bin,
      [
        "--no-warnings",
        "--no-playlist",
        "-f", fmtArg,
        "-o", tmpFile,
        ...cookieArgs,
        url,
      ],
      { maxBuffer: 10 * 1024 * 1024, timeout: 290_000 }
    );

    // Get title for Content-Disposition (fast --print call, no download)
    let safeName = "video";
    try {
      const { stdout } = await execAsync(
        bin,
        ["--print", "title", "--no-warnings", "--no-playlist", ...cookieArgs, url],
        { timeout: 10_000 }
      );
      safeName = stdout.trim().replace(/[^\w\s.-]/g, "_").slice(0, 80);
    } catch {
      // non-critical — use fallback name
    }

    const headers = new Headers({
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${safeName}.${ext}"`,
    });

    const fileStream = createReadStream(tmpFile);
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        fileStream.on("data", (chunk: Buffer | string) =>
          controller.enqueue(new Uint8Array(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
        );
        fileStream.on("end", () => {
          controller.close();
          unlinkAsync(tmpFile).catch(() => {});
        });
        fileStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
        unlinkAsync(tmpFile).catch(() => {});
      },
    });

    return new Response(readable, { headers });
  } catch (e) {
    unlinkAsync(tmpFile).catch(() => {});
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
