import Link from "next/link";
import { TOOLS } from "@/lib/tools";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        Image<span className="arrow"> → </span>Tools
      </Link>
      <nav className="site-nav" aria-label="Tools">
        {TOOLS.map((t) => (
          <Link key={t.slug} href={`/${t.slug}`}>
            {t.nav}
          </Link>
        ))}
      </nav>
    </header>
  );
}
