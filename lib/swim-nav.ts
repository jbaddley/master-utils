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

export function isSwimNavLinkActive(pathname: string, link: SwimNavLink): boolean {
  const prefix = link.matchPrefix ?? link.href.replace(/\/$/, "");
  if (link.id === "home") {
    return pathname === "/swim" || pathname === "/swim/";
  }
  return pathname.startsWith(prefix);
}
