import Link from "next/link";
import { CategoryNav } from "@/components/CategoryNav";
import { UserMenu } from "@/components/UserMenu";
import { SiteHeaderShell } from "@/components/SiteHeaderShell";
import { SearchTriggerButton } from "@/components/SearchTriggerButton";

export function SiteHeader() {
  return (
    <SiteHeaderShell>
      <Link href="/" className="brand">
        Image<span className="arrow"> → </span>Tools
      </Link>
      <CategoryNav />
      <div className="site-header-search">
        <SearchTriggerButton />
      </div>
      <UserMenu />
    </SiteHeaderShell>
  );
}
