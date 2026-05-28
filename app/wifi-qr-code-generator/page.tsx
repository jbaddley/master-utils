import type { Metadata } from "next";
import WifiQRTool from "@/features/qrcode/WifiQRTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "WiFi QR Code Generator — share your password instantly",
  description:
    "Create a QR code for your WiFi network. Guests scan it with their phone camera to connect instantly — no typing required. Free and private.",
  path: "wifi-qr-code-generator",
});

export default function Page() {
  return (
    <ToolPage
      slug="wifi-qr-code-generator"
      h1="WiFi QR Code Generator"
      appName="WiFi QR Code Generator"
      lede="Let guests join your network by scanning a QR code — no password typing needed. Enter your SSID and password, then download the code to print or share."
      steps={[
        "Enter your WiFi network name (SSID).",
        "Choose the security type (WPA/WPA2, WEP, or open).",
        "Enter your WiFi password.",
        "Download the QR code PNG and print it or display it on screen.",
      ]}
      faqs={[
        {
          q: "What phones can scan a WiFi QR code?",
          a: "iOS 11+ and Android 10+ can scan WiFi QR codes with the built-in camera app, connecting to the network automatically without any extra apps.",
        },
        {
          q: "Is it safe to share a WiFi QR code?",
          a: "Only share the QR code with people you want to give access to. Anyone who scans it gets your WiFi password, so treat it like you would the password itself.",
        },
        {
          q: "What format does the QR code use?",
          a: "The standard WIFI: URI scheme, e.g. WIFI:T:WPA;S:MyNetwork;P:MyPassword;; — this format is recognized by all major phone cameras.",
        },
        {
          q: "Is my password sent anywhere?",
          a: "No — the QR code is generated locally in your browser. Your network name and password never leave your device.",
        },
      ]}
      related={[
        { href: "/qr-code-generator", label: "QR code generator" },
        { href: "/qr-code-for-url", label: "QR code for URL" },
        { href: "/vcard-qr-code", label: "vCard QR code" },
      ]}
    >
      <WifiQRTool />
    </ToolPage>
  );
}
