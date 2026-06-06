import { NextRequest, NextResponse } from "next/server";
import { isPublicHttpUrl } from "@/lib/url-safety";

export const runtime = "nodejs";

type Hop = { from: string; status: number; to: string };

const MAX_HOPS = 10;
const TIMEOUT_MS = 12_000;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let current: string;
  try {
    current = new URL(raw.includes("://") ? raw : `https://${raw}`).href;
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!isPublicHttpUrl(current)) {
    return NextResponse.json({ error: "URL not allowed (private or unsupported)" }, { status: 400 });
  }

  const hops: Hop[] = [];

  try {
    for (let i = 0; i < MAX_HOPS; i++) {
      if (!isPublicHttpUrl(current)) {
        return NextResponse.json({ error: "Redirect target not allowed" }, { status: 400 });
      }

      const res = await fetch(current, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": "Utilio-URL-Unshortener/1.0" },
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) break;
        const next = new URL(loc, current).href;
        hops.push({ from: current, status: res.status, to: next });
        current = next;
        continue;
      }

      return NextResponse.json({ finalUrl: res.url || current, hops });
    }

    return NextResponse.json({ error: "Too many redirects" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
