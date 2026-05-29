"use client";

import { useState } from "react";
import { FaXTwitter, FaLinkedin, FaInstagram, FaFacebook } from "react-icons/fa6";
import type { IconType } from "react-icons";

type Platform = {
  name: string;
  icon: IconType;
  limit: number;
  tip: string;
  firstVisible?: number;
};

const PLATFORMS: Platform[] = [
  {
    name: "X (Twitter)",
    icon: FaXTwitter,
    limit: 280,
    tip: "URLs always count as 23 characters regardless of length.",
  },
  {
    name: "LinkedIn Post",
    icon: FaLinkedin,
    limit: 3000,
    tip: "Posts over 3,000 characters are rejected by the API.",
  },
  {
    name: "Instagram Caption",
    icon: FaInstagram,
    limit: 2200,
    tip: 'Only the first 125 characters are visible before "more".',
    firstVisible: 125,
  },
  {
    name: "Facebook",
    icon: FaFacebook,
    limit: 63206,
    tip: "Very long posts may be truncated in some feeds.",
  },
];

function getBarColor(pct: number): string {
  if (pct >= 95) return "#e5484d"; // red
  if (pct >= 80) return "#f0c674"; // amber
  return "#8ef0b5"; // green
}

function PlatformCard({ platform, count }: { platform: Platform; count: number }) {
  const Icon = platform.icon;
  const pct = Math.min((count / platform.limit) * 100, 100);
  const over = count > platform.limit;
  const barColor = over ? "#e5484d" : getBarColor(pct);

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
        <span className="font-semibold text-sm">{platform.name}</span>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: over ? "#e5484d" : "inherit" }}
        >
          {count.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground">/ {platform.limit.toLocaleString()}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>

      {platform.firstVisible && (
        <p className="text-xs text-muted-foreground">
          First {platform.firstVisible} chars visible before "more"
          {count > platform.firstVisible ? (
            <span className="text-[#f0c674]"> — yours shows a preview cut</span>
          ) : null}
        </p>
      )}

      <p className="text-xs text-muted-foreground leading-snug">{platform.tip}</p>

      {over && (
        <p className="text-xs font-medium text-[#ffb3bb]">
          {(count - platform.limit).toLocaleString()} characters over limit
        </p>
      )}
    </div>
  );
}

export default function SocialCounterTool() {
  const [text, setText] = useState("");
  const count = text.length;

  return (
    <div className="tool-ui">
      <textarea
        className="code-area"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Type or paste your post text here…"
        aria-label="Post text"
      />

      <p className="mt-2 text-right text-xs text-muted-foreground tabular-nums">
        {count.toLocaleString()} character{count !== 1 ? "s" : ""}
      </p>

      <div
        className="mt-5 grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
      >
        {PLATFORMS.map((p) => (
          <PlatformCard key={p.name} platform={p} count={count} />
        ))}
      </div>
    </div>
  );
}
