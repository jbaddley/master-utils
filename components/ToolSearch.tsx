"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuSearch } from "react-icons/lu";
import { getCatalogHref, searchTools, type CatalogEntry } from "@/lib/tool-catalog";

interface ToolSearchProps {
  variant?: "compact" | "hero";
  placeholder?: string;
  onNavigate?: () => void;
}

export function ToolSearch({
  variant = "hero",
  placeholder = "Search tools…",
  onNavigate,
}: ToolSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) {
        setResults(searchTools(query).slice(0, 8));
        setOpen(true);
      } else {
        setResults([]);
        setOpen(false);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      const entry = results[activeIndex];
      window.location.href = getCatalogHref(entry.slug);
      setOpen(false);
      onNavigate?.();
    }
  }

  return (
    <div
      ref={ref}
      className={`tool-search tool-search--${variant}`}
    >
      <div className="tool-search-input-wrap">
        <LuSearch className="tool-search-icon" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          className="tool-search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => query.trim() && setOpen(true)}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </div>
      {open && results.length > 0 && (
        <ul className="tool-search-results" role="listbox">
          {results.map((entry, i) => {
            const Icon = entry.icon;
            return (
              <li key={entry.slug} role="option" aria-selected={activeIndex === i}>
                <Link
                  href={getCatalogHref(entry.slug)}
                  className={`tool-search-result${activeIndex === i ? " is-active" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    onNavigate?.();
                  }}
                >
                  {Icon && <Icon className="tool-search-result-icon" aria-hidden />}
                  <span className="tool-search-result-body">
                    <span className="tool-search-result-title">{entry.title}</span>
                    <span className="tool-search-result-tagline">{entry.tagline}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="tool-search-results">
          <p className="tool-search-empty">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
