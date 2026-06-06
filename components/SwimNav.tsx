"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LuMenu, LuX } from "react-icons/lu";
import {
  isSwimNavLinkActive,
  SWIM_NAV_LINKS,
  swimPublicHref,
  type SwimNavLink,
} from "@/lib/swim-nav";

function visibleSwimLinks(session: ReturnType<typeof useSession>["data"]): SwimNavLink[] {
  return SWIM_NAV_LINKS.filter((link) => link.id !== "login" || !session?.user);
}

function SwimNavLinks({
  pathname,
  links,
  isSubdomain,
  onNavigate,
  className,
}: {
  pathname: string;
  links: SwimNavLink[];
  isSubdomain: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <>
      {links.map((link) => {
        const active = isSwimNavLinkActive(pathname, link, isSubdomain);
        return (
          <Link
            key={link.id}
            href={swimPublicHref(link.href, isSubdomain)}
            className={`main-nav-link${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

function SwimMobileNav({
  open,
  onClose,
  pathname,
  links,
  isSubdomain,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  links: SwimNavLink[];
  isSubdomain: boolean;
}) {
  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        className="mobile-nav-overlay"
        data-open={open ? "true" : "false"}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="mobile-nav"
        data-open={open ? "true" : "false"}
        role="dialog"
        aria-modal="true"
        aria-label="Swim navigation"
        aria-hidden={!open}
      >
        <div className="mobile-nav-header">
          <span className="mobile-nav-title">Utilio Swim</span>
          <button
            type="button"
            className="mobile-nav-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <LuX aria-hidden />
          </button>
        </div>
        <div className="mobile-nav-body">
          <ul className="mobile-nav-links mobile-nav-links--flat">
            {links.map((link) => {
              const active = isSwimNavLinkActive(pathname, link, isSubdomain);
              return (
                <li key={link.id}>
                  <Link
                    href={swimPublicHref(link.href, isSubdomain)}
                    className={`mobile-nav-link${active ? " is-active" : ""}`}
                    onClick={onClose}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}

export function SwimNav({ isSubdomain }: { isSubdomain: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const links = visibleSwimLinks(session);

  return (
    <>
      <nav className="main-nav" aria-label="Swim">
        <SwimNavLinks pathname={pathname} links={links} isSubdomain={isSubdomain} />
      </nav>

      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label="Open menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
      >
        <LuMenu aria-hidden />
      </button>

      <SwimMobileNav
        open={mobileOpen}
        onClose={closeMobile}
        pathname={pathname}
        links={links}
        isSubdomain={isSubdomain}
      />
    </>
  );
}

export function SwimUserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session?.user) return null;

  const email = session.user.email ?? "Signed in";
  const displayEmail = email.length > 24 ? `${email.slice(0, 22)}…` : email;

  return (
    <span className="swim-nav-user hidden sm:inline">{displayEmail}</span>
  );
}
