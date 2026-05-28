"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { user, signOut, openAuthModal, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={openAuthModal}>
        Sign in
      </Button>
    );
  }

  const displayEmail =
    user.email && user.email.length > 24
      ? user.email.slice(0, 22) + "…"
      : (user.email ?? "Account");

  return (
    <div className="flex items-center gap-2.5">
      <Link href="/account" className="text-[13px] text-muted-foreground hidden sm:block hover:text-foreground transition-colors">
        {displayEmail}
      </Link>
      <Button variant="outline" size="sm" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
