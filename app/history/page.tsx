"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
// useAuth will exist after another agent creates context/AuthContext.tsx
// For now just write the import — the build may not work until both agents finish
import { useAuth } from "@/context/AuthContext";

export default function HistoryPage() {
  const { user, isPro, loading, openAuthModal } = useAuth();

  return (
    <main className="page">
      <div className="page-hero">
        <h1>Export History</h1>
        <p className="lede">Your last 30 days of processed images.</p>
      </div>

      {loading ? (
        <div className="batch-empty">Loading…</div>
      ) : !user ? (
        <div className="history-empty">
          <p>Sign in to save and access your export history.</p>
          <Button onClick={openAuthModal}>Sign in</Button>
        </div>
      ) : !isPro ? (
        <div className="history-empty">
          <p>Export history is a Pro feature.</p>
          <Link href="/pricing">
            <Button>Upgrade to Pro</Button>
          </Link>
        </div>
      ) : (
        <div className="batch-empty">
          Your export history will appear here once you start downloading files.
        </div>
      )}
    </main>
  );
}
