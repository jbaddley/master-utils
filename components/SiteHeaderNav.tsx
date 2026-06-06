"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FavoritesMenu, MainNav } from "@/components/MainNav";
import { UserMenu } from "@/components/UserMenu";
import { SiteHeaderShell } from "@/components/SiteHeaderShell";
import { SearchTriggerButton } from "@/components/SearchTriggerButton";
import { DonateButton } from "@/components/DonateButton";
import { SwimNav, SwimUserMenu } from "@/components/SwimNav";
import { isSwimPath } from "@/lib/swim-nav";

export function SiteHeaderNav() {
  const pathname = usePathname();
  const isSwim = isSwimPath(pathname);

  if (isSwim) {
    return (
      <SiteHeaderShell>
        <Link href="/swim/" className="brand swim-brand">
          Utilio Swim
        </Link>
        <SwimNav />
        <div className="site-header-actions">
          <DonateButton />
          <SwimUserMenu />
        </div>
      </SiteHeaderShell>
    );
  }

  return (
    <SiteHeaderShell>
      <Link href="/" className="brand">
        Image<span className="arrow"> → </span>Tools
      </Link>
      <MainNav />
      <div className="site-header-actions">
        <DonateButton />
        <FavoritesMenu />
        <SearchTriggerButton />
      </div>
      <UserMenu />
    </SiteHeaderShell>
  );
}
