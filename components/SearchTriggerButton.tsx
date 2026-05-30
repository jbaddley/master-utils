"use client";

import { LuSearch } from "react-icons/lu";
import { useCommandPalette } from "@/context/CommandPaletteContext";

export function SearchTriggerButton() {
  const { openPalette } = useCommandPalette();

  return (
    <button
      type="button"
      className="search-trigger"
      onClick={openPalette}
      aria-label="Search tools (⌘K)"
    >
      <LuSearch className="search-trigger-icon" aria-hidden />
      <span className="search-trigger-text">Search…</span>
      <kbd className="search-trigger-kbd">⌘K</kbd>
    </button>
  );
}
