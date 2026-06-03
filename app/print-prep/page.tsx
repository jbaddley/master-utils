import type { Metadata } from "next";
import PrintPrepTool from "@/features/print/PrintPrepTool";
import { ToolPage } from "@/components/ToolPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Print Prep — resize and color-correct photos for Costco, Walmart & more",
  description:
    "Prepare photos for printing at Costco, Walmart, CVS, and other print labs. Crop to exact print sizes, apply color styles, and download print-ready files as a ZIP.",
  path: "print-prep",
});

export default function Page() {
  return (
    <ToolPage
      slug="print-prep"
      h1="Print Prep"
      appName="Photo Print Prep"
      lede="Crop, color-correct, and export photos ready for Costco, Walmart, CVS, and other print labs. Pick a size, choose a style, mark done, and download everything as a ZIP."
      steps={[
        "Upload your photos — drag and drop or click to browse. Multiple files supported.",
        "Select each photo in the grid, then choose a print size (4×6, 5×7, 8×10…).",
        "Apply a color style: B&W, Sepia, Warm, Cinematic, and more.",
        "Adjust brightness and contrast with the sliders.",
        'Click "Mark Done" to checkmark the photo and advance to the next one.',
        'Click "Download ZIP" to export all print-ready JPEGs at 300 DPI.',
      ]}
      faqs={[
        {
          q: "What print sizes are supported?",
          a: "4×6, 5×7, 4×4, 8×10, 5×5, 3.5×5, 11×14, and 12×12 inches. You can also keep the original dimensions with no crop.",
        },
        {
          q: "How does the crop work?",
          a: "Photos are center-cropped to match the selected print size ratio, then exported at exactly 300 DPI resolution. Landscape images are automatically oriented to landscape.",
        },
        {
          q: "What does the max print size label mean?",
          a: "It shows the largest size you can print without the image looking grainy, based on a minimum 200 DPI threshold. 300 DPI is recommended for best quality.",
        },
        {
          q: "What format are the exported files?",
          a: "JPEG at 93% quality — the standard format accepted by all print labs. Files are bundled into a single ZIP for easy upload.",
        },
        {
          q: "Is anything uploaded to a server?",
          a: "No. All processing runs entirely in your browser using canvas — your photos never leave your device.",
        },
      ]}
      related={[
        { href: "/resize-image", label: "Resize image" },
        { href: "/crop-image", label: "Crop image" },
        { href: "/compress-image", label: "Compress image" },
        { href: "/batch-resize", label: "Batch resize" },
      ]}
    >
      <PrintPrepTool />
    </ToolPage>
  );
}
