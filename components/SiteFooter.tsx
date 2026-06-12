import Link from "next/link";
import { canonical } from "@/lib/seo";
import { SITE_TAGLINE } from "@/lib/utilio-messaging";

const FOOTER_LINKS = [
  { label: "Home", path: "" },
  { label: "About Me", path: "why-utilio" },
  { label: "Pricing", path: "pricing" },
  { label: "API Docs", path: "api-docs" },
  { label: "Image Studio", path: "image-studio" },
  { label: "Audio Studio", path: "audio-studio" },
  { label: "PDF Tools", path: "pdf-tools" },
  { label: "QR Code Generator", path: "qr-code-generator" },
] as const;

export function SiteFooter({ isSwimSubdomain = false }: { isSwimSubdomain?: boolean }) {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} Utilio</span>
      <span>·</span>
      <span>{SITE_TAGLINE}</span>
      {FOOTER_LINKS.map(({ label, path }) => {
        if (isSwimSubdomain) {
          return (
            <a
              key={label}
              href={canonical(path)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          );
        }

        const href = path ? `/${path}` : "/";
        return (
          <Link key={label} href={href}>
            {label}
          </Link>
        );
      })}
    </footer>
  );
}
