export type AffiliateLink = {
  label: string;
  description: string;
  href: string;
  cta: string;
};

const AFFILIATES: Record<string, AffiliateLink[]> = {
  "compress-image": [
    {
      label: "Canva",
      description: "Design social posts and graphics using your compressed images.",
      href: "https://www.canva.com/",
      cta: "Try Canva free →",
    },
    {
      label: "Shopify",
      description: "Upload optimized product images to your Shopify store.",
      href: "https://www.shopify.com/",
      cta: "Start free trial →",
    },
  ],
  "resize-image": [
    {
      label: "Later",
      description: "Schedule your perfectly-sized social media images with Later.",
      href: "https://later.com/",
      cta: "Try Later free →",
    },
    {
      label: "Canva",
      description: "Drop your resized image into a Canva social media template.",
      href: "https://www.canva.com/",
      cta: "Try Canva free →",
    },
  ],
  "remove-background": [
    {
      label: "Printful",
      description: "Print your transparent PNG on merchandise and ship worldwide.",
      href: "https://www.printful.com/",
      cta: "Start with Printful →",
    },
    {
      label: "Canva",
      description: "Drop your transparent PNG into a Canva design for professional results.",
      href: "https://www.canva.com/",
      cta: "Try Canva free →",
    },
  ],
  "favicon-generator": [
    {
      label: "Namecheap",
      description: "Register a domain to go with your new favicon.",
      href: "https://www.namecheap.com/",
      cta: "Find your domain →",
    },
  ],
  "image-to-svg": [
    {
      label: "Canva",
      description: "Import your SVG into Canva for scalable, editable designs.",
      href: "https://www.canva.com/",
      cta: "Try Canva free →",
    },
  ],
  "crop-image": [
    {
      label: "Later",
      description: "Schedule your cropped images directly to social media.",
      href: "https://later.com/",
      cta: "Try Later free →",
    },
  ],
  "png-to-jpg": [
    {
      label: "Adobe Express",
      description: "Continue editing your converted image with Adobe Express.",
      href: "https://www.adobe.com/express/",
      cta: "Try Adobe Express →",
    },
  ],
  "jpg-to-png": [
    {
      label: "Remove.bg",
      description: "Remove the background from your PNG for clean product photos.",
      href: "https://www.remove.bg/",
      cta: "Remove background →",
    },
  ],
  "audio-converter": [
    {
      label: "Descript",
      description: "Edit your audio and video like a document with AI-powered transcription.",
      href: "https://www.descript.com/",
      cta: "Try Descript free →",
    },
    {
      label: "Adobe Audition",
      description: "Professional audio editing, noise reduction, and mastering.",
      href: "https://www.adobe.com/products/audition.html",
      cta: "Try Adobe Audition →",
    },
  ],
  "mp4-to-mp3": [
    {
      label: "Descript",
      description: "Transcribe and edit your audio or podcast recording with AI.",
      href: "https://www.descript.com/",
      cta: "Try Descript free →",
    },
  ],
  "trim-audio": [
    {
      label: "Descript",
      description: "Cut, trim, and edit audio using a text-based interface.",
      href: "https://www.descript.com/",
      cta: "Try Descript free →",
    },
  ],
  "qr-code-generator": [
    {
      label: "Canva",
      description: "Design QR code marketing materials with your brand colors.",
      href: "https://www.canva.com/",
      cta: "Try Canva free →",
    },
  ],
  "wifi-qr-code-generator": [
    {
      label: "Canva",
      description: "Place your WiFi QR code on a branded sign or poster.",
      href: "https://www.canva.com/",
      cta: "Design a poster →",
    },
  ],
  "restaurant-menu-qr-code": [
    {
      label: "Canva",
      description: "Design a beautiful menu or table card featuring your QR code.",
      href: "https://www.canva.com/",
      cta: "Design with Canva →",
    },
  ],
  "upscale-image": [
    {
      label: "Adobe Lightroom",
      description: "Enhance, retouch, and export your upscaled photos with Lightroom.",
      href: "https://www.adobe.com/products/photoshop-lightroom.html",
      cta: "Try Lightroom free →",
    },
  ],
  "normalize-audio": [
    {
      label: "Buzzsprout",
      description: "Host and distribute your normalized podcast with Buzzsprout.",
      href: "https://www.buzzsprout.com/",
      cta: "Start free on Buzzsprout →",
    },
  ],
  "remove-silence-from-audio": [
    {
      label: "Descript",
      description: "Remove silence and edit audio visually — like editing a text document.",
      href: "https://www.descript.com/",
      cta: "Try Descript free →",
    },
    {
      label: "Buzzsprout",
      description: "Publish your cleaned-up podcast episode on Buzzsprout.",
      href: "https://www.buzzsprout.com/",
      cta: "Start free on Buzzsprout →",
    },
  ],
  "workflow": [
    {
      label: "Shopify",
      description: "Launch your online store with Shopify and use optimized product images.",
      href: "https://www.shopify.com/",
      cta: "Start free trial →",
    },
    {
      label: "Later",
      description: "Schedule your perfectly-processed social media images with Later.",
      href: "https://later.com/",
      cta: "Try Later free →",
    },
  ],
};

export function getAffiliates(toolSlug: string): AffiliateLink[] {
  return AFFILIATES[toolSlug] ?? [];
}
