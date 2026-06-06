"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { LuSearch } from "react-icons/lu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getCatalogHref,
  getCategoryLabel,
  searchTools,
  type CatalogEntry,
} from "@/lib/tool-catalog";

type ToolSearchProps = {
  variant?: "hero" | "compact";
  autoFocus?: boolean;
  placeholder?: string;
  onNavigate?: () => void;
};

export function ToolSearch({
  variant = "hero",
  autoFocus = false,
  placeholder = "Search tools…",
  onNavigate,
}: ToolSearchProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        setActiveIndex(-1);
        return;
      }
      const found = searchTools(query).slice(0, 12);
      setResults(found);
      setActiveIndex(found.length > 0 ? 0 : -1);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const handleSelect = useCallback(
    (entry: CatalogEntry) => {
      close();
      onNavigate?.();
      setQuery("");
      setResults([]);
    },
    [close, onNavigate],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && results.length > 0) {
      setOpen(true);
      return;
    }

    if (e.key === "Escape") {
      close();
      inputRef.current?.blur();
      return;
    }

    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const entry = results[activeIndex];
      if (entry) {
        window.location.href = getCatalogHref(entry.slug);
        handleSelect(entry);
      }
    }
  };

  const showResults = open && query.trim().length > 0;

  return (
    <div
      ref={rootRef}
      className={`tool-search tool-search--${variant}`}
      role="combobox"
      aria-expanded={showResults}
      aria-haspopup="listbox"
      aria-controls={listId}
    >
      <div className="tool-search-input-wrap">
        <LuSearch className="tool-search-icon" aria-hidden />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          className={cn("tool-search-input pl-9")}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {showResults && (
        <ul id={listId} className="tool-search-results" role="listbox">
          {results.length === 0 ? (
            <li className="tool-search-empty" role="option" aria-selected={false}>
              No tools found
            </li>
          ) : (
            results.map((entry, i) => {
              const Icon = entry.icon;
              const active = i === activeIndex;
              return (
                <li key={entry.slug} role="presentation">
                  <Link
                    id={`${listId}-option-${i}`}
                    href={getCatalogHref(entry.slug)}
                    role="option"
                    aria-selected={active}
                    className={`tool-search-result${active ? " is-active" : ""}`}
                    onClick={() => handleSelect(entry)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    {Icon && <Icon className="tool-search-result-icon" aria-hidden />}
                    <span className="tool-search-result-body">
                      <span className="tool-search-result-title">{entry.title}</span>
                      <span className="tool-search-result-meta">
                        <span className="tool-search-result-badge">
                          {getCategoryLabel(entry.category)}
                        </span>
                        <span className="tool-search-result-tagline">{entry.tagline}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
