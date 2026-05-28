"use client";

import { useEffect } from "react";

export type AdSlotVariant = "leaderboard" | "rectangle" | "interstitial";

const SLOT_IDS: Record<AdSlotVariant, string> = {
  leaderboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD ?? "",
  rectangle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE ?? "",
  interstitial: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INTERSTITIAL ?? "",
};

const SIZES: Record<AdSlotVariant, { w: number; h: number }> = {
  leaderboard: { w: 728, h: 90 },
  rectangle: { w: 300, h: 250 },
  interstitial: { w: 336, h: 280 },
};

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdSlot({ variant = "rectangle" }: { variant?: AdSlotVariant }) {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
  const slotId = SLOT_IDS[variant];

  useEffect(() => {
    if (!publisherId || !slotId) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* ignore duplicate push */ }
  }, [publisherId, slotId]);

  // dev placeholder
  if (process.env.NODE_ENV === "development" && (!publisherId || !slotId)) {
    const { w, h } = SIZES[variant];
    return (
      <div
        style={{ width: w, height: h, maxWidth: "100%" }}
        className="flex items-center justify-center bg-muted border border-dashed border-border rounded-lg text-xs text-muted-foreground my-4"
      >
        Ad slot · {w}×{h}
      </div>
    );
  }

  if (!publisherId || !slotId) return null;

  const { w, h } = SIZES[variant];
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "inline-block", width: w, height: h, maxWidth: "100%" }}
      data-ad-client={publisherId}
      data-ad-slot={slotId}
    />
  );
}
