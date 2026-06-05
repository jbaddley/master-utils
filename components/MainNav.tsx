"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuMenu, LuStar, LuX } from "react-icons/lu";
import { NAV_GROUPS } from "@/lib/nav-groups";
import { useFavorites, getCatalogHref } from "@/context/FavoritesContext";
import { useCommandPalette } from "@/context/CommandPaletteContext";

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { favorites } = useFavorites();
  const { openPalette } = useCommandPalette();

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
        aria-label="Navigation"
        aria-hidden={!open}
      >
        <div className="mobile-nav-header">
          <span className="mobile-nav-title">Menu</span>
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
          <button
            type="button"
            className="mobile-nav-search-btn"
            onClick={() => {
              onClose();
              openPalette();
            }}
          >
            Search all tools…
            <kbd>⌘K</kbd>
          </button>

          <div className="mobile-nav-section-label">Categories</div>
          <ul className="mobile-nav-links mobile-nav-links--flat">
            {NAV_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <li key={group.id}>
                  <Link
                    href={group.href}
                    className="mobile-nav-link mobile-nav-link--group"
                    onClick={onClose}
                  >
                    <Icon className="mobile-nav-link-icon" aria-hidden />
                    {group.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {favorites.length > 0 && (
            <>
              <div className="mobile-nav-section-label">Favorites</div>
              <ul className="mobile-nav-links mobile-nav-links--flat">
                {favorites.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <li key={entry.slug}>
                      <Link
                        href={getCatalogHref(entry.slug)}
                        className="mobile-nav-link"
                        onClick={onClose}
                      >
                        {Icon && <Icon className="mobile-nav-link-icon" aria-hidden />}
                        {entry.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function MainNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <nav className="main-nav" aria-label="Main">
        {NAV_GROUPS.map((group) => {
          const active = pathname.startsWith(group.href);
          return (
            <Link
              key={group.id}
              href={group.href}
              className={`main-nav-link${active ? " is-active" : ""}`}
            >
              {group.label}
            </Link>
          );
        })}
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

      <MobileNav open={mobileOpen} onClose={closeMobile} />
    </>
  );
}

export function FavoritesMenu() {
  const { favorites, removeFavorite } = useFavorites();
  const [open, setOpen] = useState(false);

  return (
    <div className={`favorites-menu${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="favorites-menu-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          favorites.length > 0
            ? `Favorites (${favorites.length})`
            : "Favorites — star any tool to save it here"
        }
        onClick={() => setOpen((v) => !v)}
      >
        <LuStar className="favorites-menu-icon" aria-hidden />
        {favorites.length > 0 && (
          <span className="favorites-menu-count">{favorites.length}</span>
        )}
      </button>
      {open && (
        <>
          <div
            className="favorites-menu-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="favorites-menu-panel">
            <div className="favorites-menu-header">Favorites</div>
            {favorites.length === 0 ? (
              <p className="favorites-menu-empty">
                Star any tool page to pin it here for quick access.
              </p>
            ) : (
              <ul className="favorites-menu-list">
                {favorites.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <li key={entry.slug}>
                      <Link
                        href={getCatalogHref(entry.slug)}
                        className="favorites-menu-item"
                        onClick={() => setOpen(false)}
                      >
                        {Icon && <Icon className="favorites-menu-item-icon" aria-hidden />}
                        <span className="favorites-menu-item-title">{entry.title}</span>
                      </Link>
                      <button
                        type="button"
                        className="favorites-menu-remove"
                        aria-label={`Remove ${entry.title} from favorites`}
                        onClick={() => removeFavorite(entry.slug)}
                      >
                        <LuX aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
