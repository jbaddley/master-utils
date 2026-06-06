import Link from "next/link";
import { FavoritesMenu, MainNav } from "@/components/MainNav";
import { UserMenu } from "@/components/UserMenu";
import { SiteHeaderShell } from "@/components/SiteHeaderShell";
import { SearchTriggerButton } from "@/components/SearchTriggerButton";
import { DonateButton } from "@/components/DonateButton";

export function SiteHeader() {
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
