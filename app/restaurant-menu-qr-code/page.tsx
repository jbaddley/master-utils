import type { Metadata } from "next";
import QRCodeTool from "@/features/qrcode/QRCodeTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Restaurant Menu QR Code Generator — free & instant",
  description:
    "Create a QR code that links to your restaurant menu. Guests scan it with any phone camera to view your menu instantly. Free, no account needed.",
  path: "restaurant-menu-qr-code",
});

export default function Page() {
  return (
    <ToolPage
      slug="restaurant-menu-qr-code"
      h1="Restaurant Menu QR Code Generator"
      appName="Restaurant Menu QR Code Generator"
      lede="Give diners instant access to your menu — just paste your menu URL and download a print-ready QR code. Works with any phone camera, no app required."
      steps={[
        "Paste the URL of your online menu (PDF, website, or delivery platform link).",
        "Choose 512 px for print quality or 256 px for digital use.",
        "Optionally raise the error correction level if the code will be printed on a textured surface.",
        "Download the PNG and add it to table tents, menus, signage, or receipts.",
      ]}
      faqs={[
        {
          q: "What menu URL should I use?",
          a: "Use any publicly accessible URL — your restaurant website, a PDF uploaded to Google Drive, a page on Toast, Square, or any delivery platform. Make sure the link works without logging in.",
        },
        {
          q: "What size QR code should I print?",
          a: "For table cards, at least 2.5 cm (1 inch) square is recommended. Download the 512 px version for the sharpest results when printing.",
        },
        {
          q: "Which error correction level is best for printed menus?",
          a: "Use Q or H if the code will be placed on textured surfaces, near grease, or in low-contrast print. These levels let scanners read the code even if part of it is damaged or dirty.",
        },
        {
          q: "Do my menu URL or data get stored anywhere?",
          a: "No — the QR code is generated entirely in your browser. Nothing is uploaded or stored on any server.",
        },
        {
          q: "Can I update the menu without reprinting the QR code?",
          a: "If you use a URL shortener or a dynamic link, you can update the destination URL at any time without changing the QR code itself. Otherwise, you would need to regenerate and reprint the code.",
        },
      ]}
      related={[
        { href: "/qr-code-generator", label: "QR code generator" },
        { href: "/qr-code-for-url", label: "QR code for URL" },
        { href: "/wifi-qr-code-generator", label: "WiFi QR code" },
        { href: "/vcard-qr-code", label: "vCard QR code" },
      ]}
    >
      <QRCodeTool />
    </ToolPage>
  );
}
