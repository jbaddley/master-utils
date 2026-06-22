import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import { getYtdlAgent } from "@/lib/ytdl-agent";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const info = await ytdl.getInfo(url, { agent: getYtdlAgent() });
    const { videoDetails: vd } = info;

    // Combined (video + audio) streams — typically up to 720p
    const videoFormats = ytdl
      .filterFormats(info.formats, "videoandaudio")
      .filter(f => f.qualityLabel)
      .map(f => ({
        itag: f.itag,
        quality: f.qualityLabel!,
        container: f.container ?? "mp4",
        size: f.contentLength ? Number(f.contentLength) : null,
      }))
      .filter((f, i, a) => a.findIndex(x => x.quality === f.quality) === i)
      .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

    // Best audio-only streams
    const audioFormats = ytdl
      .filterFormats(info.formats, "audioonly")
      .sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0))
      .slice(0, 4)
      .map(f => ({
        itag: f.itag,
        bitrate: f.audioBitrate ?? 0,
        container: f.container ?? "m4a",
        size: f.contentLength ? Number(f.contentLength) : null,
      }));

    return NextResponse.json({
      title: vd.title,
      duration: Number(vd.lengthSeconds),
      thumbnail: vd.thumbnails.at(-1)?.url ?? null,
      author: vd.author.name,
      videoFormats,
      audioFormats,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
