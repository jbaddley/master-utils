import { NextRequest, NextResponse } from "next/server";
import {
  getSubdomainLabel,
  getSubdomainPath,
  shouldPrefixAllPaths,
  SUBDOMAIN_APEX,
} from "@/lib/subdomains";

/** Auth.js trustHost reads X-Forwarded-*; Caddy → Node often leaves the internal origin as localhost:3000. */
function forwardProxyHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  const host = headers.get("host");
  if (host) {
    headers.set("x-forwarded-host", host);
  }
  const proto =
    headers.get("x-forwarded-proto") ??
    (request.nextUrl.protocol === "https:" ? "https" : "http");
  headers.set("x-forwarded-proto", proto);
  return headers;
}

function passThrough(request: NextRequest) {
  return NextResponse.next({
    request: { headers: forwardProxyHeaders(request) },
  });
}

function rewriteTo(request: NextRequest, url: URL) {
  return NextResponse.rewrite(url, {
    request: { headers: forwardProxyHeaders(request) },
  });
}

export function middleware(request: NextRequest) {
  const label = getSubdomainLabel(request.headers.get("host") ?? "");
  if (!label) {
    return passThrough(request);
  }

  const targetPath = getSubdomainPath(label);
  if (!targetPath) {
    return NextResponse.redirect(new URL(`https://${SUBDOMAIN_APEX}/`, request.url));
  }

  const base = `/${targetPath.replace(/^\/|\/$/g, "")}`;
  const { pathname } = request.nextUrl;

  if (shouldPrefixAllPaths(label)) {
    if (pathname.startsWith(base)) {
      return passThrough(request);
    }
    // App Router API routes are always mounted at /api/*, not under /swim.
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return passThrough(request);
    }
    const suffix = pathname === "/" ? "" : pathname.replace(/\/$/, "");
    const url = request.nextUrl.clone();
    url.pathname = `${base}${suffix}/`;
    return rewriteTo(request, url);
  }

  if (pathname !== "/" && pathname !== "") {
    return passThrough(request);
  }

  const url = request.nextUrl.clone();
  url.pathname = `${base}/`;
  return rewriteTo(request, url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
