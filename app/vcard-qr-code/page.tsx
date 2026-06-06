import type { Metadata } from "next";
import VCardQRTool from "@/features/qrcode/VCardQRTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "vCard QR Code Generator — share contact info by scanning",
  description:
    "Create a QR code with your contact details. When scanned, it adds your name, phone, email, and website directly to the phone's contacts — no typing needed.",
  path: "vcard-qr-code",
});

export default function Page() {
  return (
    <ToolPage
      slug="vcard-qr-code"
      h1="vCard QR Code Generator"
      appName="vCard QR Code Generator"
      lede="Turn your contact details into a scannable QR code. Anyone who scans it can save your name, phone, email, and website directly to their phone — instantly."
      steps={[
        "Enter your full name, phone number, email address, and website.",
        "The QR code updates in real time as you fill in the fields.",
        "Click Download PNG to save the contact QR code.",
        "Add it to your business card, email signature, or presentation slides.",
      ]}
      faqs={[
        {
          q: "What is a vCard QR code?",
          a: "A vCard QR code encodes contact information (name, phone, email, website) in the vCard 3.0 format. When scanned, most phones offer to save the details straight to Contacts.",
        },
        {
          q: "Which phones can scan a vCard QR code?",
          a: "Most modern smartphones — including iPhone (iOS 11+) and Android devices — can scan vCard QR codes with the built-in camera app and prompt you to add the contact.",
        },
        {
          q: "Do I need to fill in every field?",
          a: "No — all fields are optional. Fill in only the information you want to share. The QR code will only contain the fields you provide.",
        },
        {
          q: "Is my contact information sent to a server?",
          a: "No — the QR code is generated entirely in your browser. Your data is not uploaded to Utilio servers for this tool.",
        },
        {
          q: "Can I add a photo or other fields?",
          a: "This tool supports the most commonly used vCard fields (name, phone, email, website). For advanced vCard fields like photos or multiple phone numbers, you would need a dedicated vCard editor.",
        },
      ]}
      related={[
        { href: "/qr-code-generator", label: "QR code generator" },
        { href: "/wifi-qr-code-generator", label: "WiFi QR code" },
        { href: "/qr-code-for-url", label: "QR code for URL" },
        { href: "/restaurant-menu-qr-code", label: "Restaurant menu QR code" },
      ]}
    >
      <VCardQRTool />
    </ToolPage>
  );
}
