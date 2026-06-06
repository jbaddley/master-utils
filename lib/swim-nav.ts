import { getSubdomainLabel } from "@/lib/subdomains";

export type SwimNavLink = {
  id: string;
  label: string;
  href: string;
  /** Match pathname prefix for active state (defaults to href without trailing slash). */
  matchPrefix?: string;
};

export const SWIM_NAV_LINKS: SwimNavLink[] = [
  { id: "home", label: "Home", href: "/swim/", matchPrefix: "/swim" },
  { id: "manage", label: "Manage meets", href: "/swim/manage/", matchPrefix: "/swim/manage" },
  { id: "login", label: "Sign in", href: "/swim/login/", matchPrefix: "/swim/login" },
];

export function isSwimPath(pathname: string): boolean {
  return pathname === "/swim" || pathname.startsWith("/swim/");
}

/** True when the host is swim.utilio.solutions (browser URL paths omit /swim prefix). */
export function isSwimSubdomainHost(host: string): boolean {
  return getSubdomainLabel(host) === "swim";
}

export function isSwimAppPath(pathname: string, host?: string | null): boolean {
  return isSwimPath(pathname) || Boolean(host && isSwimSubdomainHost(host));
}

/** Map browser pathname on swim subdomain to internal /swim/* path for active states. */
export function toInternalSwimPath(pathname: string, isSubdomain: boolean): string {
  if (!isSubdomain) return pathname;
  if (pathname === "/" || pathname === "") return "/swim/";
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return `/swim${normalized}`;
}

/** Public href for swim routes (short paths on swim subdomain). */
export function swimPublicHref(internalHref: string, isSubdomain: boolean): string {
  if (!isSubdomain) return internalHref;
  const stripped = internalHref.replace(/^\/swim\/?/, "/");
  return stripped === "/" ? "/" : stripped.endsWith("/") ? stripped : `${stripped}/`;
}

export function isSwimNavLinkActive(
  pathname: string,
  link: SwimNavLink,
  isSubdomain = false,
): boolean {
  const internalPath = toInternalSwimPath(pathname, isSubdomain);
  const prefix = link.matchPrefix ?? link.href.replace(/\/$/, "");
  if (link.id === "home") {
    return internalPath === "/swim" || internalPath === "/swim/";
  }
  return internalPath.startsWith(prefix);
}
