import type { NextRequest } from "next/server";
import ytdl from "@distube/ytdl-core";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");
  const type = (searchParams.get("type") ?? "video") as "video" | "audio";
  const itag = searchParams.get("itag");

  if (!url) return Response.json({ error: "url required" }, { status: 400 });

  try {
    const info = await ytdl.getInfo(url);

    const options: ytdl.downloadOptions = itag
      ? { quality: parseInt(itag) as unknown as ytdl.downloadOptions["quality"] }
      : {
          filter: type === "audio" ? "audioonly" : "videoandaudio",
          quality: type === "audio" ? "highestaudio" : "highest",
        };

    const format = ytdl.chooseFormat(info.formats, options);
    const stream = ytdl.downloadFromInfo(info, options);

    const ext = type === "audio" ? "m4a" : "mp4";
    const mime = type === "audio" ? "audio/mp4" : "video/mp4";
    const safeName = info.videoDetails.title.replace(/[^\w\s.-]/g, "_").slice(0, 80);

    const headers = new Headers();
    headers.set("Content-Type", mime);
    headers.set("Content-Disposition", `attachment; filename="${safeName}.${ext}"`);
    if (format.contentLength) headers.set("Content-Length", format.contentLength);

    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        stream.on("end", () => controller.close());
        stream.on("error", (err: Error) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new Response(readable, { headers });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
