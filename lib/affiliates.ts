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
};

export function getAffiliates(toolSlug: string): AffiliateLink[] {
  return AFFILIATES[toolSlug] ?? [];
}
