import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");
  const from = parseFloat(searchParams.get("from") ?? "0");
  const toParam = searchParams.get("to");
  const to = toParam ? parseFloat(toParam) : Infinity;

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const { YoutubeTranscript } = await import("youtube-transcript");
    const items = await YoutubeTranscript.fetchTranscript(url);

    const filtered = items
      .filter(item => {
        const start = (item.offset ?? 0) / 1000;
        return start >= from && start <= (isFinite(to) ? to : Infinity);
      })
      .map(item => ({
        text: item.text,
        start: (item.offset ?? 0) / 1000,
        duration: (item.duration ?? 0) / 1000,
      }));

    return NextResponse.json({ items: filtered });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
