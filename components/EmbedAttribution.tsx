"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export function EmbedAttribution() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("attribution") === "0") setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <div style={{
      textAlign: "center",
      padding: "0.5rem",
      fontSize: "11px",
      color: "var(--muted-foreground, #888)",
      borderTop: "1px solid var(--border, #e5e7eb)",
      marginTop: "1rem",
    }}>
      Powered by{" "}
      <Link
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit", textDecoration: "underline" }}
      >
        {SITE_NAME}
      </Link>
    </div>
  );
}
