import { NextRequest } from "next/server";

// Proxy YouTube thumbnails to satisfy COEP require-corp — i.ytimg.com doesn't
// set Cross-Origin-Resource-Policy headers so images would be blocked otherwise.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || !url.startsWith("https://")) {
    return new Response(null, { status: 400 });
  }

  try {
    const upstream = await fetch(url);
    const blob = await upstream.blob();
    return new Response(blob, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600, immutable",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
