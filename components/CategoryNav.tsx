"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuChevronDown, LuMenu, LuX } from "react-icons/lu";
import { ToolSearch } from "@/components/ToolSearch";
import {
  TOOL_CATEGORIES,
  getCatalogHref,
  getMenuToolsByCategory,
  type ToolCategory,
} from "@/lib/tool-catalog";

function CategoryDropdown({
  categoryId,
  label,
  onNavigate,
}: {
  categoryId: ToolCategory;
  label: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tools = getMenuToolsByCategory(categoryId);
  const catInfo = TOOL_CATEGORIES.find((c) => c.id === categoryId);
  const CatIcon = catInfo?.icon;

  const featured = tools.filter((t) => t.featured).slice(0, 4);
  const more = tools.filter((t) => !t.featured).slice(0, 4);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    onNavigate?.();
  }, [onNavigate]);

  return (
    <div ref={ref} className={`category-nav-item${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="category-nav-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        {CatIcon && <CatIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />}
        {label}
        <LuChevronDown className="category-nav-chevron" aria-hidden />
      </button>
      {open && (
        <div className="mega-menu animate-in fade-in slide-in-from-top-1 duration-[140ms]">
          {catInfo && (
            <div className="mega-menu-header">
              {CatIcon && <CatIcon className="mega-menu-header-icon" aria-hidden />}
              <div className="mega-menu-header-text">
                <span className="mega-menu-header-title">{catInfo.label}</span>
                <span className="mega-menu-header-desc">{catInfo.description}</span>
              </div>
            </div>
          )}

          {featured.length > 0 ? (
            <div className="mega-menu-cols">
              <div className="mega-menu-col">
                <div className="mega-menu-col-hd">Featured</div>
                {featured.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <Link
                      key={entry.slug}
                      href={getCatalogHref(entry.slug)}
                      className="mega-menu-featured-item"
                      onClick={close}
                    >
                      {Icon && <Icon className="mega-menu-featured-icon" aria-hidden />}
                      <span className="mega-menu-featured-body">
                        <span className="mega-menu-featured-title">{entry.title}</span>
                        <span className="mega-menu-featured-tagline">{entry.tagline}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              {more.length > 0 && (
                <div className="mega-menu-col">
                  <div className="mega-menu-col-hd">More</div>
                  <ul className="mega-menu-slim-list">
                    {more.map((entry) => (
                      <li key={entry.slug}>
                        <Link
                          href={getCatalogHref(entry.slug)}
                          className="mega-menu-slim-link"
                          onClick={close}
                        >
                          {entry.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="mega-menu-col mega-menu-col--full">
              <ul className="mega-menu-slim-list">
                {tools.slice(0, 8).map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      href={getCatalogHref(entry.slug)}
                      className="mega-menu-slim-link"
                      onClick={close}
                    >
                      {entry.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href={`/#category-${categoryId}`}
            className="mega-menu-footer"
            onClick={close}
          >
            View all {label} tools →
          </Link>
        </div>
      )}
    </div>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<ToolCategory | null>(null);

  useEffect(() => {
    if (!open) {
      setExpanded(null);
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
        aria-label="Tools menu"
        aria-hidden={!open}
      >
        <div className="mobile-nav-header">
          <span className="mobile-nav-title">Browse tools</span>
          <button
            type="button"
            className="mobile-nav-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <LuX aria-hidden />
          </button>
        </div>
        <div className="mobile-nav-search">
          <ToolSearch variant="compact" placeholder="Search all tools…" onNavigate={onClose} />
        </div>
        <div className="mobile-nav-sections">
          {TOOL_CATEGORIES.map((cat) => {
            const tools = getMenuToolsByCategory(cat.id);
            const isExpanded = expanded === cat.id;
            const CatIcon = cat.icon;
            return (
              <div key={cat.id} className="mobile-nav-section">
                <button
                  type="button"
                  className="mobile-nav-section-trigger"
                  aria-expanded={isExpanded}
                  onClick={() => setExpanded(isExpanded ? null : cat.id)}
                >
                  <CatIcon className="mobile-nav-section-icon" aria-hidden />
                  <span className="mobile-nav-section-label">{cat.label}</span>
                  <span className="mobile-nav-section-count">{tools.length}</span>
                  <LuChevronDown
                    className={`mobile-nav-section-chevron${isExpanded ? " is-expanded" : ""}`}
                    aria-hidden
                  />
                </button>
                {isExpanded && (
                  <ul className="mobile-nav-links">
                    {tools.map((entry) => {
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function CategoryNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <nav className="category-nav" aria-label="Tool categories">
        {TOOL_CATEGORIES.map((cat) => (
          <CategoryDropdown key={cat.id} categoryId={cat.id} label={cat.label} />
        ))}
      </nav>
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label="Open tools menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
      >
        <LuMenu aria-hidden />
      </button>
      <MobileNav open={mobileOpen} onClose={closeMobile} />
    </>
  );
}
