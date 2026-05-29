import Link from "next/link";
import { CategoryNav } from "@/components/CategoryNav";
import { ToolSearch } from "@/components/ToolSearch";
import { UserMenu } from "@/components/UserMenu";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        Image<span className="arrow"> → </span>Tools
      </Link>
      <CategoryNav />
      <div className="site-header-search">
        <ToolSearch variant="compact" placeholder="Search…" />
      </div>
      <UserMenu />
    </header>
  );
}
