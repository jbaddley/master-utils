"use client";

import { LuStar } from "react-icons/lu";
import { useFavorites } from "@/context/FavoritesContext";

export function FavoriteToggle({ slug, title }: { slug: string; title: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(slug);

  return (
    <button
      type="button"
      className={`favorite-toggle${active ? " is-active" : ""}`}
      aria-label={active ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
      aria-pressed={active}
      onClick={() => toggleFavorite(slug)}
    >
      <LuStar aria-hidden />
    </button>
  );
}
