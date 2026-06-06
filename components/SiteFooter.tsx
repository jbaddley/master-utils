import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} Utilio</span>
      <span>·</span>
      <span>Free, in-browser media tools — your files never leave your device.</span>
      <Link href="/">Home</Link>
      <Link href="/pricing">Pricing</Link>
      <Link href="/api-docs">API Docs</Link>
      <Link href="/compress-image">Compress Image</Link>
      <Link href="/convert-audio">Convert Audio</Link>
      <Link href="/pdf-tools">PDF Tools</Link>
      <Link href="/qr-code-generator">QR Code Generator</Link>
    </footer>
  );
}
