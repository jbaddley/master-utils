import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} Image Tools</span>
      <span>·</span>
      <span>Free, in-browser image utilities — your files never leave your device.</span>
      <Link href="/">Home</Link>
    </footer>
  );
}
