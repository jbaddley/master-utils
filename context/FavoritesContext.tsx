"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  TOOL_CATALOG,
  getCatalogHref,
  type CatalogEntry,
} from "@/lib/tool-catalog";

const STORAGE_KEY = "utilio-tool-favorites";

interface FavoritesContextValue {
  favorites: CatalogEntry[];
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (slug: string) => void;
  removeFavorite: (slug: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSlugs(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  }, [slugs, hydrated]);

  const catalogBySlug = useMemo(
    () => new Map(TOOL_CATALOG.map((e) => [e.slug, e])),
    [],
  );

  const favorites = useMemo(
    () =>
      slugs
        .map((slug) => catalogBySlug.get(slug))
        .filter((e): e is CatalogEntry => e !== undefined),
    [slugs, catalogBySlug],
  );

  const isFavorite = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggleFavorite = useCallback((slug: string) => {
    setSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }, []);

  const removeFavorite = useCallback((slug: string) => {
    setSlugs((prev) => prev.filter((s) => s !== slug));
  }, []);

  return (
    <FavoritesContext.Provider
      value={{ favorites, isFavorite, toggleFavorite, removeFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}

export { getCatalogHref };
