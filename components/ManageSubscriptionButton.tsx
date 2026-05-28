"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function ManageSubscriptionButton() {
  const { isPro } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPro) return null;

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open portal. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "Loading…" : "Manage subscription"}
      </Button>
      {error && (
        <p style={{ color: "var(--destructive, red)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
