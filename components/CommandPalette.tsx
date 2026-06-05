"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuSearch, LuStar, LuX } from "react-icons/lu";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { useFavorites } from "@/context/FavoritesContext";
import { NAV_GROUPS } from "@/lib/nav-groups";
import {
  getCatalogHref,
  getCategoryLabel,
  searchTools,
  type CatalogEntry,
} from "@/lib/tool-catalog";

type PaletteItem =
  | { type: "tool"; entry: CatalogEntry }
  | { type: "group"; href: string; label: string };

export function CommandPalette() {
  const { open, closePalette } = useCommandPalette();
  const { favorites } = useFavorites();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const idleItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = favorites.map((entry) => ({
      type: "tool" as const,
      entry,
    }));
    for (const group of NAV_GROUPS) {
      items.push({ type: "group", href: group.href, label: group.label });
    }
    return items;
  }, [favorites]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    const t = setTimeout(() => {
      setResults(searchTools(query).slice(0, 12));
      setActiveIndex(0);
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      closePalette();
    },
    [router, closePalette],
  );

  const listLen = query.trim() ? results.length : idleItems.length;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      closePalette();
      return;
    }
    if (listLen === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, listLen - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      if (query.trim()) {
        const entry = results[idx];
        if (entry) navigate(getCatalogHref(entry.slug));
      } else {
        const item = idleItems[idx];
        if (item?.type === "tool") navigate(getCatalogHref(item.entry.slug));
        if (item?.type === "group") navigate(item.href);
      }
    }
  }

  if (!open) return null;

  const showResults = query.trim().length > 0;

  return (
    <>
      <div className="cmd-palette-overlay" onClick={closePalette} aria-hidden />
      <div
        className="cmd-palette animate-in fade-in slide-in-from-top-2 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
      >
        <div className="cmd-palette-input-row">
          <LuSearch className="cmd-palette-search-icon" aria-hidden />
          <input
            ref={inputRef}
            className="cmd-palette-input"
            placeholder="Search any tool…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-controls="cmd-palette-list"
          />
          <button
            type="button"
            className="cmd-palette-clear"
            onClick={closePalette}
            aria-label="Close"
          >
            <LuX aria-hidden />
          </button>
        </div>

        {!showResults && (
          <div className="cmd-palette-empty" id="cmd-palette-list">
            {favorites.length > 0 && (
              <>
                <div className="cmd-palette-section-label">
                  <LuStar aria-hidden /> Favorites
                </div>
                <ul className="cmd-palette-results cmd-palette-results--compact">
                  {favorites.map((entry, i) => {
                    const Icon = entry.icon;
                    return (
                      <li key={entry.slug}>
                        <Link
                          href={getCatalogHref(entry.slug)}
                          className={`cmd-palette-result${activeIndex === i ? " is-active" : ""}`}
                          onClick={closePalette}
                        >
                          {Icon && <Icon className="cmd-palette-result-icon" aria-hidden />}
                          <span className="cmd-palette-result-title">{entry.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <div className="cmd-palette-section-label">Browse</div>
            <div className="cmd-palette-cat-grid">
              {NAV_GROUPS.map((group, i) => {
                const Icon = group.icon;
                const idx = favorites.length + i;
                return (
                  <Link
                    key={group.id}
                    href={group.href}
                    className={`cmd-palette-cat-tile${activeIndex === idx ? " is-active" : ""}`}
                    onClick={closePalette}
                  >
                    <Icon className="cmd-palette-cat-icon" aria-hidden />
                    <span className="cmd-palette-cat-label">{group.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {showResults && results.length === 0 && (
          <p className="cmd-palette-no-results">No tools match &ldquo;{query}&rdquo;</p>
        )}

        {showResults && results.length > 0 && (
          <ul className="cmd-palette-results" id="cmd-palette-list" role="listbox">
            {results.map((entry, i) => {
              const Icon = entry.icon;
              return (
                <li key={entry.slug} role="option" aria-selected={activeIndex === i}>
                  <Link
                    href={getCatalogHref(entry.slug)}
                    className={`cmd-palette-result${activeIndex === i ? " is-active" : ""}`}
                    onClick={closePalette}
                  >
                    {Icon && <Icon className="cmd-palette-result-icon" aria-hidden />}
                    <span className="cmd-palette-result-body">
                      <span className="cmd-palette-result-title">{entry.title}</span>
                      <span className="cmd-palette-result-meta">
                        <span className="cmd-palette-result-badge">
                          {getCategoryLabel(entry.category)}
                        </span>
                        <span className="cmd-palette-result-tagline">{entry.tagline}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="cmd-palette-footer" aria-hidden>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>/</kbd> or <kbd>⌘K</kbd> search
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </>
  );
}
