import type { Metadata } from "next";
import QRCodeTool from "@/features/qrcode/QRCodeTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "QR Code for URL — generate a scannable link in seconds",
  description:
    "Paste any URL and get a QR code instantly. Download a high-resolution PNG to use in print, email, or social — free and runs entirely in your browser.",
  path: "qr-code-for-url",
});

export default function Page() {
  return (
    <ToolPage
      slug="qr-code-for-url"
      h1="QR Code for URL"
      appName="URL QR Code Generator"
      lede="Paste any link and download a crisp QR code PNG. Perfect for business cards, flyers, posters, or anywhere you need a scannable shortcut to a web page."
      steps={[
        "Paste the URL you want to turn into a QR code.",
        "Adjust the size and error correction level if needed.",
        "The QR code preview updates instantly as you type.",
        "Click Download PNG to save the image for print or digital use.",
      ]}
      faqs={[
        {
          q: "Can I use a QR code for any URL?",
          a: "Yes — you can encode any URL, including https links, http links, and even custom deep-link schemes. Just paste the full URL into the input field.",
        },
        {
          q: "What image size should I download?",
          a: "For on-screen use 256 px is usually plenty. For print at business-card or flyer size, choose 512 px to keep the code crisp at higher DPI.",
        },
        {
          q: "Do short URLs work better than long ones?",
          a: "Shorter URLs produce less dense QR codes that are easier to scan, especially when printed small. If your URL is very long, consider using a URL shortener first.",
        },
        {
          q: "Does the URL get sent to your server?",
          a: "No — everything runs in your browser using the open-source qrcode library. Your URL never leaves your device.",
        },
      ]}
      related={[
        { href: "/qr-code-generator", label: "QR code generator" },
        { href: "/wifi-qr-code-generator", label: "WiFi QR code" },
        { href: "/vcard-qr-code", label: "vCard QR code" },
        { href: "/restaurant-menu-qr-code", label: "Restaurant menu QR code" },
      ]}
    >
      <QRCodeTool />
    </ToolPage>
  );
}
