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

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className={`category-nav-item${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="category-nav-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <LuChevronDown className="category-nav-chevron" aria-hidden />
      </button>
      {open && (
        <div className="category-nav-dropdown">
          <ul className="category-nav-list">
            {tools.map((entry) => {
              const Icon = entry.icon;
              return (
                <li key={entry.slug}>
                  <Link
                    href={getCatalogHref(entry.slug)}
                    className="category-nav-link"
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                  >
                    {Icon && <Icon className="category-nav-link-icon" aria-hidden />}
                    <span className="category-nav-link-body">
                      <span className="category-nav-link-title">{entry.title}</span>
                      <span className="category-nav-link-tagline">{entry.tagline}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={`/#category-${categoryId}`}
            className="category-nav-view-all"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            View all on home
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

  if (!open) return null;

  return (
    <>
      <div className="mobile-nav-overlay" onClick={onClose} aria-hidden />
      <div className="mobile-nav" role="dialog" aria-modal="true" aria-label="Tools menu">
        <div className="mobile-nav-header">
          <span className="mobile-nav-title">Browse tools</span>
          <button type="button" className="mobile-nav-close" onClick={onClose} aria-label="Close menu">
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
                    {tools.map((entry) => (
                      <li key={entry.slug}>
                        <Link
                          href={getCatalogHref(entry.slug)}
                          className="mobile-nav-link"
                          onClick={onClose}
                        >
                          {entry.title}
                        </Link>
                      </li>
                    ))}
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
