import { NextRequest, NextResponse } from "next/server";
import { getSubdomainLabel, getSubdomainPath, SUBDOMAIN_APEX } from "@/lib/subdomains";

export function middleware(request: NextRequest) {
  const label = getSubdomainLabel(request.headers.get("host") ?? "");
  if (!label) {
    return NextResponse.next();
  }

  const targetPath = getSubdomainPath(label);
  if (!targetPath) {
    return NextResponse.redirect(new URL(`https://${SUBDOMAIN_APEX}/`, request.url));
  }

  const { pathname } = request.nextUrl;
  if (pathname !== "/" && pathname !== "") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${targetPath.replace(/^\/|\/$/g, "")}/`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
