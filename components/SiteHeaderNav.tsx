"use client";

import Link from "next/link";
import { FavoritesMenu, MainNav } from "@/components/MainNav";
import { UserMenu } from "@/components/UserMenu";
import { SiteHeaderShell } from "@/components/SiteHeaderShell";
import { SearchTriggerButton } from "@/components/SearchTriggerButton";
import { DonateButton } from "@/components/DonateButton";
import { SwimNav, SwimUserMenu } from "@/components/SwimNav";
import { swimPublicHref } from "@/lib/swim-nav";
import { useSwimApp } from "@/hooks/useSwimApp";

export function SiteHeaderNav({ isSwimSubdomain = false }: { isSwimSubdomain?: boolean }) {
  const { isSwim, isSubdomain } = useSwimApp(isSwimSubdomain);

  if (isSwim) {
    return (
      <SiteHeaderShell>
        <Link href={swimPublicHref("/swim/", isSubdomain)} className="brand swim-brand">
          Utilio Swim
        </Link>
        <SwimNav isSubdomain={isSubdomain} />
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
