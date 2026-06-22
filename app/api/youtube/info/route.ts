import { NextRequest, NextResponse } from "next/server";
import { ytdlpJson } from "@/lib/ytdlp";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const data = await ytdlpJson(url);

    const formats = (data.formats as Record<string, unknown>[]) ?? [];

    // Combined video+audio streams ≤ 720p (no server-side ffmpeg merge needed)
    const videoFormats = formats
      .filter(
        (f) =>
          f.vcodec !== "none" &&
          f.acodec !== "none" &&
          typeof f.height === "number" &&
          (f.height as number) <= 720 &&
          f.ext === "mp4"
      )
      .map((f) => ({
        itag: parseInt(f.format_id as string, 10) || (f.format_id as string),
        quality: `${f.height}p`,
        container: f.ext as string,
        size: (f.filesize as number | null) ?? null,
      }))
      .filter((f, i, a) => a.findIndex((x) => x.quality === f.quality) === i)
      .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

    // Best audio-only streams
    const audioFormats = formats
      .filter((f) => f.vcodec === "none" && f.acodec !== "none")
      .sort((a, b) => ((b.abr as number) ?? 0) - ((a.abr as number) ?? 0))
      .slice(0, 4)
      .map((f) => ({
        itag: parseInt(f.format_id as string, 10) || (f.format_id as string),
        bitrate: (f.abr as number) ?? 0,
        container: (f.ext as string) ?? "m4a",
        size: (f.filesize as number | null) ?? null,
      }));

    const thumbnails = data.thumbnails as { url: string }[] | undefined;

    return NextResponse.json({
      title: data.title,
      duration: data.duration,
      thumbnail: (data.thumbnail as string) ?? thumbnails?.at(-1)?.url ?? null,
      author: (data.uploader as string) ?? (data.channel as string) ?? "",
      videoFormats,
      audioFormats,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
