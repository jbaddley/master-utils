"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuSearch, LuX } from "react-icons/lu";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import {
  TOOL_CATEGORIES,
  getCatalogHref,
  getCategoryLabel,
  searchTools,
  type CatalogEntry,
} from "@/lib/tool-catalog";

export function CommandPalette() {
  const { open, closePalette } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    const t = setTimeout(() => {
      setResults(searchTools(query).slice(0, 9));
      setActiveIndex(-1);
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

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const listLen = results.length > 0 ? results.length : TOOL_CATEGORIES.length;
    if (e.key === "Escape") {
      closePalette();
      return;
    }
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
      if (results.length > 0) {
        const entry = results[activeIndex >= 0 ? activeIndex : 0];
        navigate(getCatalogHref(entry.slug));
      } else if (activeIndex >= 0) {
        navigate(`/#category-${TOOL_CATEGORIES[activeIndex].id}`);
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
            placeholder="Search tools…"
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
          <div className="cmd-palette-empty">
            <div className="cmd-palette-cat-grid" id="cmd-palette-list">
              {TOOL_CATEGORIES.map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.id}
                    href={`/#category-${cat.id}`}
                    className={`cmd-palette-cat-tile${activeIndex === i ? " is-active" : ""}`}
                    onClick={closePalette}
                  >
                    <Icon className="cmd-palette-cat-icon" aria-hidden />
                    <span className="cmd-palette-cat-label">{cat.label}</span>
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
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </>
  );
}
