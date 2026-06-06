import Link from "next/link";
import { SITE_TAGLINE } from "@/lib/utilio-messaging";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} Utilio</span>
      <span>·</span>
      <span>{SITE_TAGLINE}</span>
      <Link href="/">Home</Link>
      <Link href="/why-utilio">About Me</Link>
      <Link href="/pricing">Pricing</Link>
      <Link href="/api-docs">API Docs</Link>
      <Link href="/compress-image">Compress Image</Link>
      <Link href="/convert-audio">Convert Audio</Link>
      <Link href="/pdf-tools">PDF Tools</Link>
      <Link href="/qr-code-generator">QR Code Generator</Link>
    </footer>
  );
}
