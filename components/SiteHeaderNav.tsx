"use client";

import Link from "next/link";
import Image from "next/image";
import { FavoritesMenu, MainNav } from "@/components/MainNav";
import { UserMenu } from "@/components/UserMenu";
import { SiteHeaderShell } from "@/components/SiteHeaderShell";
import { SearchTriggerButton } from "@/components/SearchTriggerButton";
import { DonateButtonSlot } from "@/components/DonateButtonSlot";
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
          <DonateButtonSlot />
          <SwimUserMenu />
        </div>
      </SiteHeaderShell>
    );
  }

  return (
    <SiteHeaderShell>
      <Link href="/" className="brand">
        <Image src="/tuilio-logo.svg" alt="Tuilio" width={32} height={32} priority className="h-8 w-auto" />
      </Link>
      <MainNav />
      <div className="site-header-actions">
        <DonateButtonSlot />
        <FavoritesMenu />
        <SearchTriggerButton />
      </div>
      <UserMenu />
    </SiteHeaderShell>
  );
}
