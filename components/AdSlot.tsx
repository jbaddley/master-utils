"use client";

export type AdSlotVariant = "leaderboard" | "rectangle" | "interstitial";

const SIZES: Record<AdSlotVariant, { w: number; h: number }> = {
  leaderboard: { w: 728, h: 90 },
  rectangle: { w: 300, h: 250 },
  interstitial: { w: 336, h: 280 },
};

export function AdSlot({ variant = "rectangle" }: { variant?: AdSlotVariant }) {
  // In production with a real ad network, this would render the ad script/ins element.
  // For now, render a visible placeholder in dev, nothing in prod unless real ads are configured.
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev) return null;

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
