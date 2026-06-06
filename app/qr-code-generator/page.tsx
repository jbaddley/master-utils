import type { Metadata } from "next";
import QRCodeTool from "@/features/qrcode/QRCodeTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "QR Code Generator — free online QR code maker",
  description:
    "Generate a QR code for any URL or text instantly. Choose size and error correction level, then download a PNG — free and private, runs in your browser.",
  path: "qr-code-generator",
});

export default function Page() {
  return (
    <ToolPage
      slug="qr-code-generator"
      h1="QR Code Generator"
      appName="QR Code Generator"
      lede="Turn any URL or text into a scannable QR code in seconds. Pick a size, choose error correction, and download the PNG — no account needed."
      steps={[
        "Type or paste the URL or text you want to encode.",
        "Choose a size (128, 256, or 512 px) and error correction level.",
        "The QR code updates in real time as you type.",
        "Click Download PNG to save the image.",
      ]}
      faqs={[
        {
          q: "What can I encode in a QR code?",
          a: "Almost anything: URLs, plain text, email addresses, phone numbers, Wi-Fi credentials, vCards, and more. Most phone cameras can scan and act on common formats automatically.",
        },
        {
          q: "What is error correction level?",
          a: "Error correction lets a QR code be read even if part of it is damaged or obscured. Level L corrects up to 7% damage, M up to 15%, Q up to 25%, and H up to 30%. Higher levels produce denser codes.",
        },
        {
          q: "What size should I use?",
          a: "256 px is a good all-purpose size for digital use. Use 512 px if you plan to print the code at larger sizes to keep it crisp.",
        },
        {
          q: "Are my URLs sent to a server?",
          a: "No — the QR code is generated entirely in your browser using the open-source qrcode library. Nothing is sent to Utilio servers for this tool.",
        },
      ]}
      related={[
        { href: "/wifi-qr-code-generator", label: "WiFi QR code" },
        { href: "/qr-code-for-url", label: "QR code for URL" },
        { href: "/vcard-qr-code", label: "vCard QR code" },
        { href: "/restaurant-menu-qr-code", label: "Restaurant menu QR code" },
      ]}
    >
      <QRCodeTool />
    </ToolPage>
  );
}
