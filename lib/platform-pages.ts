import type { QA, RelatedLink } from "@/components/ToolPage";

export type PlatformPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  tool: "resize" | "compress";
  defaultPresetId?: string;
  presetW?: number;
  presetH?: number;
  steps: string[];
  faqs: QA[];
  related: RelatedLink[];
};

export const PLATFORM_PAGES: PlatformPage[] = [
  {
    slug: "resize-image-for-instagram",
    tool: "resize",
    defaultPresetId: "ig-post",
    title: "Resize Image for Instagram — free online tool",
    description:
      "Resize images to perfect Instagram dimensions: 1080×1080 posts, 1080×1920 stories and reels. Free, private, runs in your browser.",
    h1: "Resize Image for Instagram",
    lede:
      "Get pixel-perfect dimensions for every Instagram format — square posts (1080×1080), portrait posts (1080×1350), and Stories/Reels (1080×1920) — all resized locally in your browser.",
    steps: [
      "Drop or select your image.",
      "Choose an Instagram preset (Post, Story, Reel) from the Social Media Presets panel.",
      "Download the resized image.",
    ],
    faqs: [
      {
        q: "What size should Instagram posts be?",
        a: "Instagram recommends 1080×1080 px for square posts, 1080×1350 px for portrait, and 1080×566 px for landscape.",
      },
      {
        q: "What size is an Instagram Story or Reel?",
        a: "Stories and Reels should be 1080×1920 px (9:16 aspect ratio).",
      },
      {
        q: "Are my images uploaded anywhere?",
        a: "No — all resizing runs entirely in your browser. For this tool, files are processed in your browser and are not uploaded to Utilio servers.",
      },
    ],
    related: [
      { href: "/image-studio", label: "Image Studio" },
      { href: "/png-to-jpg", label: "Convert image" },
    ],
  },
  {
    slug: "resize-image-for-youtube",
    tool: "resize",
    defaultPresetId: "yt-thumb",
    title: "Resize Image for YouTube — thumbnail & banner sizes",
    description:
      "Resize images to YouTube thumbnail (1280×720) and channel art (2560×1440) dimensions. Free, private, runs in your browser.",
    h1: "Resize Image for YouTube",
    lede:
      "Create YouTube-ready thumbnails at 1280×720 px and channel art at 2560×1440 px — resize in your browser instantly, no upload needed.",
    steps: [
      "Drop or select your image.",
      "Pick YouTube Thumbnail (1280×720) or Channel Art (2560×1440) from the presets.",
      "Download the resized file.",
    ],
    faqs: [
      {
        q: "What size is a YouTube thumbnail?",
        a: "YouTube recommends 1280×720 px (16:9 aspect ratio) with a maximum file size of 2 MB.",
      },
      {
        q: "What size is YouTube channel art?",
        a: "YouTube channel banner should be 2560×1440 px. The safe area that shows on all devices is the central 1546×423 px.",
      },
      {
        q: "What format should YouTube thumbnails be?",
        a: "JPG, PNG, or WebP all work. JPG is the most widely used — use our converter if you need to change format.",
      },
    ],
    related: [
      { href: "/image-studio", label: "Image Studio" },
      { href: "/jpg-to-webp", label: "JPG to WebP" },
    ],
  },
  {
    slug: "resize-image-for-linkedin",
    tool: "resize",
    defaultPresetId: "li-banner",
    title: "Resize Image for LinkedIn — banner & post sizes",
    description:
      "Resize images to correct LinkedIn dimensions: 1584×396 banner, 1200×627 posts. Free, private, runs in your browser.",
    h1: "Resize Image for LinkedIn",
    lede:
      "Resize to LinkedIn's exact dimensions — profile banner (1584×396 px) or link preview posts (1200×627 px) — right in your browser.",
    steps: [
      "Drop or select your image.",
      "Choose LinkedIn Banner or LinkedIn Post from the Social Media Presets panel.",
      "Download the resized image.",
    ],
    faqs: [
      {
        q: "What size is a LinkedIn banner?",
        a: "The LinkedIn profile/company page banner should be 1584×396 px.",
      },
      {
        q: "What size are LinkedIn post images?",
        a: "LinkedIn displays shared link images at 1200×627 px (1.91:1 aspect ratio).",
      },
      {
        q: "Does this tool upload my image?",
        a: "No — resizing runs in your browser for this tool. Files are not uploaded to Utilio servers.",
      },
    ],
    related: [
      { href: "/image-studio", label: "Image Studio" },
      { href: "/png-to-jpg", label: "PNG to JPG" },
    ],
  },
  {
    slug: "compress-image-for-shopify",
    tool: "compress",
    title: "Compress Image for Shopify — optimize product photos",
    description:
      "Compress product images for Shopify. Smaller files load faster, improve SEO, and reduce bounce rate. Free, private, browser-based.",
    h1: "Compress Image for Shopify",
    lede:
      "Shopify's image CDN re-compresses uploads anyway — but starting with an optimized file gives you faster load times and a better Lighthouse score. Compress your product photos here, free, with no upload.",
    steps: [
      "Drop or select your product image.",
      "Choose WebP or JPEG output and adjust quality until the file size is under 500 KB.",
      "Download and upload the optimized image to Shopify.",
    ],
    faqs: [
      {
        q: "What is the ideal image size for Shopify?",
        a: "Shopify recommends keeping product images under 70 KB for fastest load times, but under 500 KB is acceptable. Use WebP format for the best compression-to-quality ratio.",
      },
      {
        q: "Will compressing reduce my image quality?",
        a: "At 70–85% quality, compression is nearly invisible to the human eye. Use the live preview to find the right balance.",
      },
      {
        q: "What format should Shopify images be?",
        a: "WebP is best — it's 25–35% smaller than JPEG at the same quality. Shopify supports WebP in all modern browsers.",
      },
    ],
    related: [
      { href: "/image-studio", label: "Image Studio" },
      { href: "/png-to-webp", label: "PNG to WebP" },
      { href: "/jpg-to-webp", label: "JPG to WebP" },
    ],
  },
  {
    slug: "compress-image-for-web",
    tool: "compress",
    title: "Compress Image for Web — optimize for fast load times",
    description:
      "Compress images for faster web pages. Reduce file size without visible quality loss. Free, private, runs entirely in your browser.",
    h1: "Compress Image for Web",
    lede:
      "Images are the #1 cause of slow web pages. Compress your images to WebP or JPEG here — no upload, no server, just fast local processing that runs in your browser.",
    steps: [
      "Drop or select your image.",
      "Choose WebP for best compression, or JPEG for widest compatibility.",
      "Adjust the quality slider until the file size meets your target.",
      "Download and replace the original on your site.",
    ],
    faqs: [
      {
        q: "What image format is best for the web?",
        a: "WebP is the modern standard — 25–35% smaller than JPEG at the same quality, with alpha transparency support. Use JPEG as a fallback for older browsers.",
      },
      {
        q: "What file size should web images be?",
        a: "Hero images: under 200 KB. Thumbnails and icons: under 30 KB. Product photos: under 100 KB. These are general guidelines — use the smallest size that looks good.",
      },
      {
        q: "Does this affect Core Web Vitals?",
        a: "Yes — LCP (Largest Contentful Paint) is often caused by a large image. Reducing the hero image size can meaningfully improve your Lighthouse score.",
      },
    ],
    related: [
      { href: "/png-to-webp", label: "PNG to WebP" },
      { href: "/jpg-to-webp", label: "JPG to WebP" },
      { href: "/image-studio", label: "Image Studio" },
    ],
  },
  {
    slug: "compress-image-for-wordpress",
    tool: "compress",
    title: "Compress Image for WordPress — smaller uploads, faster sites",
    description:
      "Compress images before uploading to WordPress. Reduce file size to improve page speed and SEO rankings. Free, private, browser-based.",
    h1: "Compress Image for WordPress",
    lede:
      "Large images are a top cause of slow WordPress sites. Compress before uploading — this tool runs in your browser and files are not uploaded to Utilio servers.",
    steps: [
      "Drop or select your image.",
      "Choose WebP or JPEG and dial in the quality slider.",
      "Download the compressed image and upload it to your WordPress Media Library.",
    ],
    faqs: [
      {
        q: "Does WordPress support WebP?",
        a: "Yes — WordPress 5.8+ natively supports WebP uploads. It is the recommended format for smaller file sizes.",
      },
      {
        q: "What image size is best for WordPress?",
        a: "For full-width blog images, aim for 1200–1600 px wide and under 200 KB. For thumbnails, 300–600 px and under 50 KB.",
      },
      {
        q: "Should I use a plugin instead?",
        a: "Plugins like Smush or ShortPixel compress after upload, but compressing before upload is faster and avoids storing the original bloated file.",
      },
    ],
    related: [
      { href: "/image-studio", label: "Image Studio" },
      { href: "/png-to-webp", label: "PNG to WebP" },
      { href: "/jpg-to-webp", label: "JPG to WebP" },
    ],
  },
  {
    slug: "compress-image-for-email",
    tool: "compress",
    title: "Compress Image for Email — reduce attachment size free",
    description:
      "Compress images to email-safe sizes. Most providers cap attachments at 10–25 MB. Free, private, runs entirely in your browser.",
    h1: "Compress Image for Email",
    lede:
      "Shrink image files to email-safe sizes — most providers cap attachments at 10–25 MB. Your image is compressed locally in your browser, never uploaded.",
    steps: [
      "Drop or select your image.",
      "Choose WebP or JPEG and set quality to 60–70% for a good size/quality balance.",
      "Download the compressed image and attach it to your email.",
    ],
    faqs: [
      {
        q: "What is the attachment size limit for email?",
        a: "Most email providers enforce limits between 10 MB and 25 MB. Gmail allows up to 25 MB, Outlook up to 20 MB, and Yahoo Mail up to 25 MB. Compressing images well below these limits ensures reliable delivery.",
      },
      {
        q: "What is the best format for email image attachments?",
        a: "JPEG is the safest choice for broad compatibility. WebP produces smaller files but may not preview in all email clients. For inline images in HTML emails, JPEG or PNG are most reliable.",
      },
      {
        q: "Is my image uploaded to a server when I compress it?",
        a: "No — all compression runs entirely in your browser using WebAssembly. Your image is not uploaded to Utilio servers for this tool.",
      },
    ],
    related: [
      { href: "/image-studio", label: "Image Studio" },
      { href: "/png-to-jpg", label: "PNG to JPG" },
    ],
  },
  {
    slug: "compress-image-for-etsy",
    tool: "compress",
    title: "Compress Image for Etsy — optimize listing photos free",
    description:
      "Compress Etsy listing photos to under 1 MB for fast loading. Free, private, browser-based WebP and JPEG compression.",
    h1: "Compress Image for Etsy",
    lede:
      "Etsy recommends images under 1 MB for fast loading. Compress your listing photos to WebP or JPEG without losing the quality buyers expect.",
    steps: [
      "Upload your product photo.",
      "Select WebP at 80% quality for the best balance.",
      "Download and upload to your Etsy listing.",
    ],
    faqs: [
      {
        q: "What are Etsy's image requirements?",
        a: "Etsy accepts JPEG, PNG, GIF, and WebP images up to 10 MB. For best display, images should be at least 2000 px on the shortest side. Keeping files under 1 MB ensures fast loading for shoppers.",
      },
      {
        q: "What format should I use for Etsy listing photos?",
        a: "JPEG is the most common format for product photos. WebP produces smaller files at the same quality, which helps with page speed. Both formats are supported by Etsy.",
      },
      {
        q: "Will compressing my Etsy photos reduce quality noticeably?",
        a: "At 80% quality, compression is virtually invisible to buyers. Use the live preview to compare the original and compressed versions before downloading.",
      },
    ],
    related: [
      { href: "/image-studio", label: "Image Studio" },
      { href: "/compress-image-for-shopify", label: "Compress for Shopify" },
      { href: "/png-to-jpg", label: "PNG to JPG" },
    ],
  },
  {
    slug: "compress-image-for-woocommerce",
    tool: "compress",
    title: "Compress Image for WooCommerce — speed up your store",
    description:
      "Compress WooCommerce product images to WebP under 200 KB for faster page loads and better Google rankings. Free, private, browser-based.",
    h1: "Compress Image for WooCommerce",
    lede:
      "Large product images slow down WooCommerce stores and hurt SEO. Compress to WebP under 200 KB for fast page loads and better Google rankings.",
    steps: [
      "Select your product image.",
      "Choose WebP at 75% quality.",
      "Download and upload to your WooCommerce media library.",
    ],
    faqs: [
      {
        q: "What image size is recommended for WooCommerce?",
        a: "WooCommerce product images look best at 800×800 px or larger for the zoom feature. Aim for file sizes under 200 KB to keep page loads fast. For thumbnails (used in category pages), 300×300 px under 50 KB is ideal.",
      },
      {
        q: "Why is WebP the best format for WooCommerce?",
        a: "WebP files are 25–35% smaller than JPEG at the same quality. Smaller files mean faster load times, lower bounce rates, and better Core Web Vitals scores — all of which impact Google rankings for your store.",
      },
      {
        q: "How does image size affect Core Web Vitals?",
        a: "Large images directly hurt your LCP (Largest Contentful Paint) score, which Google uses as a ranking factor. Compressing product images to under 200 KB can significantly improve your Lighthouse performance score.",
      },
    ],
    related: [
      { href: "/compress-image-for-shopify", label: "Compress for Shopify" },
      { href: "/compress-image-for-web", label: "Compress for web" },
      { href: "/compress-image-for-wordpress", label: "Compress for WordPress" },
    ],
  },
  {
    slug: "resize-image-for-tiktok",
    tool: "resize",
    defaultPresetId: "tt-video",
    title: "Resize Image for TikTok — 1080×1920 free online",
    description:
      "Resize images to TikTok's 1080×1920 px (9:16) dimensions. Free, private, runs in your browser — no upload needed.",
    h1: "Resize Image for TikTok",
    lede:
      "TikTok videos and profile images need a 9:16 ratio at 1080×1920 px. Resize your images to the exact dimensions in your browser — no upload needed.",
    steps: [
      "Drop or select your image.",
      "Click the TikTok/Reel preset (1080×1920).",
      "Download and upload to TikTok.",
    ],
    faqs: [
      {
        q: "What are the TikTok video dimensions?",
        a: "TikTok videos should be 1080×1920 px at a 9:16 aspect ratio. This is the full-screen vertical format used for all TikTok content.",
      },
      {
        q: "What size is a TikTok profile photo?",
        a: "TikTok profile photos display at 200×200 px but are stored at higher resolutions. Upload at least 400×400 px for a sharp result on high-DPI screens.",
      },
      {
        q: "Why does aspect ratio matter on TikTok?",
        a: "TikTok is designed for vertical full-screen viewing. Images or videos that are not 9:16 will be letterboxed or cropped, reducing visual impact. Using 1080×1920 px fills the screen perfectly.",
      },
    ],
    related: [
      { href: "/resize-image-for-instagram", label: "Resize for Instagram" },
      { href: "/image-studio", label: "Image Studio" },
    ],
  },
  {
    slug: "resize-image-for-facebook",
    tool: "resize",
    defaultPresetId: "fb-cover",
    title: "Resize Image for Facebook — cover, post & ad sizes",
    description:
      "Resize images to Facebook cover (820×312), post (1200×630), and profile picture (180×180) dimensions. Free, private, browser-based.",
    h1: "Resize Image for Facebook",
    lede:
      "Facebook cover photos are 820×312 px, posts are 1200×630 px. Select a preset and resize your image to the exact Facebook spec in seconds.",
    steps: [
      "Drop or select your image.",
      "Choose the Facebook Cover preset (820×312) or manually enter dimensions.",
      "Download the resized image.",
    ],
    faqs: [
      {
        q: "What size is a Facebook cover photo?",
        a: "Facebook cover photos display at 820×312 px on desktop and 640×360 px on mobile. Designing at 820×312 px ensures your cover looks good on both.",
      },
      {
        q: "What is the best size for a Facebook post image?",
        a: "Facebook recommends 1200×630 px for shared link images and post photos. This gives a clear preview when your content is shared or appears in the feed.",
      },
      {
        q: "What size should a Facebook profile picture be?",
        a: "Facebook profile pictures display at 170×170 px on desktop. Upload at 180×180 px or larger to ensure sharpness. The image displays as a circle, so make sure your subject is centered.",
      },
    ],
    related: [
      { href: "/resize-image-for-instagram", label: "Resize for Instagram" },
      { href: "/resize-image-for-linkedin", label: "Resize for LinkedIn" },
      { href: "/image-studio", label: "Image Studio" },
    ],
  },
  {
    slug: "resize-image-for-twitter",
    tool: "resize",
    defaultPresetId: "tw-header",
    title: "Resize Image for Twitter / X — header & post sizes",
    description:
      "Resize images to X (Twitter) header (1500×500) and profile photo (400×400) dimensions. Free, private, runs in your browser.",
    h1: "Resize Image for X (Twitter)",
    lede:
      "Twitter/X header images are 1500×500 px and profile photos 400×400 px. Resize your images to the exact spec — free, private, no account needed.",
    steps: [
      "Drop or select your image.",
      "Use the X (Twitter) Header preset (1500×500) or enter dimensions manually.",
      "Download and upload to X.",
    ],
    faqs: [
      {
        q: "What size is a Twitter / X header image?",
        a: "The X (Twitter) profile header image should be 1500×500 px. The image may be cropped on different devices, so keep important content toward the center.",
      },
      {
        q: "What size is a Twitter / X profile picture?",
        a: "X profile photos display at 400×400 px and are shown as a circle. Upload at 400×400 px minimum for a crisp result.",
      },
      {
        q: "What size should Twitter / X post images be?",
        a: "For post images on X, 1200×675 px (16:9 ratio) is recommended. Single images display at a 2:1 ratio in the timeline, so a 1200×600 px image also works well.",
      },
    ],
    related: [
      { href: "/resize-image-for-instagram", label: "Resize for Instagram" },
      { href: "/resize-image-for-linkedin", label: "Resize for LinkedIn" },
      { href: "/image-studio", label: "Image Studio" },
    ],
  },
  {
    slug: "resize-image-for-pinterest",
    tool: "resize",
    title: "Resize Image for Pinterest — optimal pin dimensions",
    description:
      "Resize images to Pinterest's optimal 1000×1500 px (2:3 ratio) pin dimensions. Free, private, runs in your browser.",
    h1: "Resize Image for Pinterest",
    lede:
      "Pinterest pins perform best at 1000×1500 px (2:3 ratio). Resize your images to the optimal Pinterest dimensions for maximum reach and saves.",
    steps: [
      "Drop or select your image.",
      "Enter 1000 for width and 1500 for height, then unlock aspect ratio if needed.",
      "Download the resized pin.",
    ],
    faqs: [
      {
        q: "What is the optimal Pinterest pin size?",
        a: "Pinterest recommends a 2:3 aspect ratio, with 1000×1500 px being the ideal size. Pins taller than 1260 px may be truncated in the feed, so 1000×1500 px is the sweet spot.",
      },
      {
        q: "Can I use square images on Pinterest?",
        a: "Yes — square pins (1000×1000 px) are supported. However, the taller 2:3 format typically gets more engagement because it takes up more vertical space in the feed.",
      },
      {
        q: "What size are Pinterest infographic pins?",
        a: "Infographics on Pinterest can be taller — up to 1000×2100 px. Keep in mind that very tall pins may be truncated in the feed but will display fully when clicked.",
      },
    ],
    related: [
      { href: "/resize-image-for-instagram", label: "Resize for Instagram" },
      { href: "/image-studio", label: "Image Studio" },
    ],
  },
  {
    slug: "resize-image-for-amazon",
    tool: "resize",
    title: "Resize Image for Amazon — product image requirements",
    description:
      "Resize product photos to Amazon's minimum 1000 px (recommended 1600–2000 px) requirements for Seller Central. Free, private, browser-based.",
    h1: "Resize Image for Amazon Listings",
    lede:
      "Amazon requires product images to be at least 1000 px on the longest side (1600+ recommended for zoom). Resize your photos to Amazon's exact spec.",
    steps: [
      "Drop or select your product photo.",
      "Set the longest side to 1600 px (Amazon recommends 1600–2000 px).",
      "Download and upload to Amazon Seller Central.",
    ],
    faqs: [
      {
        q: "What are Amazon's main image requirements?",
        a: "Amazon requires main product images to have a pure white background (RGB 255, 255, 255), with the product filling at least 85% of the frame. The minimum size is 1000 px on the longest side, but 1600–2000 px is recommended.",
      },
      {
        q: "Why does Amazon recommend 1600 px or more?",
        a: "Images over 1000 px on the longest side activate Amazon's zoom feature, which lets shoppers hover to see detail. Images at 1600–2000 px provide a noticeably sharper zoom experience.",
      },
      {
        q: "What file formats does Amazon accept?",
        a: "Amazon accepts JPEG, PNG, GIF, and TIFF. JPEG is preferred for product photos because it produces the smallest files at high quality, which speeds up page loads.",
      },
    ],
    related: [
      { href: "/compress-image-for-shopify", label: "Compress for Shopify" },
      { href: "/compress-image-for-etsy", label: "Compress for Etsy" },
      { href: "/image-studio", label: "Image Studio" },
    ],
  },
  {
    slug: "crop-image-for-profile-picture",
    tool: "compress",
    title: "Crop Image for Profile Picture — perfect circle crop free",
    description:
      "Crop and resize your photo to a perfect square for profile pictures on LinkedIn, Facebook, and Google. Free, private, browser-based.",
    h1: "Crop & Resize Profile Picture",
    lede:
      "Profile pictures for LinkedIn, Facebook, and Google display as circles but are stored as squares. Crop your photo to a perfect 400×400 or 800×800 square, then compress for fast loading.",
    steps: [
      "Drop or select your photo.",
      "Crop to square using our Crop Image tool (linked below).",
      "Compress the cropped image here before uploading.",
    ],
    faqs: [
      {
        q: "What is the ideal size for a profile picture?",
        a: "400×400 px is the minimum recommended size for most platforms. 800×800 px is better for high-DPI (retina) screens, as it will look sharp even when the platform doubles the pixel density.",
      },
      {
        q: "Why do profile pictures need to be square?",
        a: "Most platforms (LinkedIn, Facebook, Google, Twitter/X) display profile photos as circles, but they store and transmit the image as a square. If your photo is not square before upload, the platform crops it automatically — often badly.",
      },
      {
        q: "How large should my profile picture file be?",
        a: "Most platforms accept up to 5–8 MB, but you rarely need more than 200–300 KB at 800×800 px. Smaller files upload faster and display just as sharply.",
      },
    ],
    related: [
      { href: "/image-studio", label: "Image Studio" },
    ],
  },
  {
    slug: "compress-image-for-google-pagespeed",
    tool: "compress",
    title: "Compress Images for Google PageSpeed — free WebP converter",
    description:
      "Compress and convert images to WebP to pass Google PageSpeed Insights. Free, private, runs entirely in your browser.",
    h1: "Compress Images for Google PageSpeed",
    lede:
      "Google PageSpeed Insights recommends serving images in next-gen formats (WebP/AVIF) and under 200 KB. Compress and convert here — free, instant, runs in your browser.",
    steps: [
      "Drop or select your image.",
      "Select WebP format at 75–80% quality.",
      "Download the optimized image and replace it on your website.",
    ],
    faqs: [
      {
        q: "What does Google PageSpeed Insights recommend for images?",
        a: "PageSpeed recommends serving images in next-gen formats (WebP or AVIF), sizing images correctly for the display size, and keeping them under 200 KB where possible. These optimizations directly improve your LCP and overall performance score.",
      },
      {
        q: "How do images affect Core Web Vitals?",
        a: "LCP (Largest Contentful Paint) is one of Google's three Core Web Vitals and is often caused by a large hero image. Reducing the hero image to under 200 KB in WebP format can have an immediate positive effect on your LCP score.",
      },
      {
        q: "How do I serve WebP images on my website?",
        a: "The simplest method is using the HTML <picture> element with a WebP source and a JPEG fallback. Most modern CDNs (Cloudflare, Fastly, Imgix) can also auto-convert and serve WebP to supporting browsers.",
      },
    ],
    related: [
      { href: "/compress-image-for-web", label: "Compress for web" },
      { href: "/compress-image-for-wordpress", label: "Compress for WordPress" },
      { href: "/compress-image-for-woocommerce", label: "Compress for WooCommerce" },
    ],
  },
  {
    slug: "resize-image-for-youtube-thumbnail",
    tool: "resize",
    defaultPresetId: "yt-thumb",
    title: "Resize Image for YouTube Thumbnail — 1280×720 free",
    description:
      "Resize any image to YouTube's required 1280×720 px (16:9) thumbnail size. Free, private, runs in your browser.",
    h1: "Resize Image for YouTube Thumbnail",
    lede:
      "YouTube thumbnails must be 1280×720 px (16:9 ratio) and under 2 MB. Resize any photo to the exact spec in your browser in seconds.",
    steps: [
      "Drop or select your image.",
      "The YouTube Thumbnail preset (1280×720) is pre-selected.",
      "Download the resized thumbnail.",
    ],
    faqs: [
      {
        q: "What size should a YouTube thumbnail be?",
        a: "YouTube requires thumbnails to be 1280×720 px at a 16:9 aspect ratio. This is also the minimum required resolution. Thumbnails smaller than 1280×720 will appear blurry in search results and recommendations.",
      },
      {
        q: "What is the file size limit for YouTube thumbnails?",
        a: "YouTube thumbnails must be under 2 MB. At 1280×720 px, a well-compressed JPEG is typically 100–400 KB — well within the limit.",
      },
      {
        q: "What is the best file format for YouTube thumbnails?",
        a: "JPG is the most common format for YouTube thumbnails and produces the smallest file sizes for photographic content. PNG is better if your thumbnail has text, logos, or transparent elements.",
      },
    ],
    related: [
      { href: "/resize-image-for-youtube", label: "Resize for YouTube" },
      { href: "/image-studio", label: "Image Studio" },
    ],
  },
  {
    slug: "resize-image-for-linkedin-banner",
    tool: "resize",
    defaultPresetId: "li-banner",
    title: "Resize Image for LinkedIn Banner — 1584×396 free",
    description:
      "Resize images to the LinkedIn profile banner size of 1584×396 px. Free, private, runs in your browser.",
    h1: "Resize Image for LinkedIn Banner",
    lede:
      "LinkedIn profile banners display at 1584×396 px on desktop. Resize your banner image to the exact LinkedIn spec — free, private, no account needed.",
    steps: [
      "Drop or select your image.",
      "The LinkedIn Banner preset (1584×396) is pre-selected.",
      "Download and upload to your LinkedIn profile.",
    ],
    faqs: [
      {
        q: "What is the LinkedIn profile banner size?",
        a: "LinkedIn profile banners display at 1584×396 px on desktop. The image is cropped differently on mobile, so keep important content in the central portion of the banner.",
      },
      {
        q: "What is the LinkedIn company page banner size?",
        a: "LinkedIn company page covers display at 1128×191 px. This is different from the personal profile banner — make sure to use the correct dimensions for each.",
      },
      {
        q: "What size is a LinkedIn profile picture?",
        a: "LinkedIn profile photos display at 400×400 px. Upload at 400×400 px or larger for a sharp result on high-resolution screens.",
      },
    ],
    related: [
      { href: "/resize-image-for-linkedin", label: "Resize for LinkedIn" },
      { href: "/resize-image-for-twitter", label: "Resize for Twitter/X" },
      { href: "/image-studio", label: "Image Studio" },
    ],
  },
  {
    slug: "compress-image-for-instagram",
    tool: "compress",
    title: "Compress Image for Instagram — reduce size without quality loss",
    description:
      "Compress Instagram photos to under 1 MB for faster uploads and less compression by Instagram. Free, private, browser-based.",
    h1: "Compress Image for Instagram",
    lede:
      "Instagram recompresses uploaded images, so start with high quality. But keeping files under 1 MB speeds up uploads and reduces Instagram's compression artifacts.",
    steps: [
      "Drop or select your photo.",
      "Choose JPEG at 85% quality for the best Instagram result.",
      "Download and post directly to Instagram.",
    ],
    faqs: [
      {
        q: "What is the Instagram file size limit for photos?",
        a: "Instagram accepts photo files up to 8 MB. However, Instagram re-compresses anything you upload, so starting with a well-compressed file (under 1 MB) gives you more control over final image quality.",
      },
      {
        q: "What is the best format for Instagram photos?",
        a: "JPEG at 85% or higher quality is the best starting point for Instagram. Instagram's own compression works better with JPEG than with PNG. Keeping quality at 85%+ reduces additional compression artifacts after Instagram processes the image.",
      },
      {
        q: "Does Instagram compress my photos?",
        a: "Yes — Instagram automatically recompresses all uploaded photos. Uploading at higher quality (JPEG 85–95%) and correct dimensions (1080×1080 for square, 1080×1350 for portrait) gives Instagram the best source to work from, resulting in a sharper final image.",
      },
    ],
    related: [
      { href: "/resize-image-for-instagram", label: "Resize for Instagram" },
      { href: "/image-studio", label: "Image Studio" },
      { href: "/png-to-jpg", label: "PNG to JPG" },
    ],
  },
  {
    slug: "resize-image-for-open-graph",
    tool: "resize",
    defaultPresetId: "og-image",
    title: "Resize Image for Open Graph / Social Preview — 1200×630",
    description:
      "Resize images to the Open Graph og:image standard of 1200×630 px for sharp social previews on Facebook, LinkedIn, and Slack. Free, private, browser-based.",
    h1: "Resize Image for Open Graph (Social Preview)",
    lede:
      "Open Graph images (og:image) appear when your page is shared on Facebook, LinkedIn, and Slack. The required size is 1200×630 px for sharp previews on all platforms.",
    steps: [
      "Drop or select your image.",
      "Use the Open Graph / Meta preset (1200×630).",
      "Download and reference it in your og:image meta tag.",
    ],
    faqs: [
      {
        q: "What is Open Graph?",
        a: "Open Graph is a set of HTML meta tags that control how your web page appears when shared on social platforms like Facebook, LinkedIn, Slack, and iMessage. The og:image tag sets the preview image that appears alongside your link.",
      },
      {
        q: "What is the recommended og:image size?",
        a: "1200×630 px is the standard recommended by Facebook and used by most platforms. This gives a 1.91:1 aspect ratio. Images smaller than 600×315 px will not render as large previews on Facebook.",
      },
      {
        q: "How do I add an og:image to my HTML?",
        a: 'Add this tag inside your <head> element: <meta property="og:image" content="https://yoursite.com/og-image.jpg" />. Also add og:image:width (1200) and og:image:height (630) tags for best results.',
      },
    ],
    related: [
      { href: "/resize-image-for-linkedin", label: "Resize for LinkedIn" },
      { href: "/resize-image-for-facebook", label: "Resize for Facebook" },
      { href: "/resize-image-for-twitter", label: "Resize for Twitter/X" },
    ],
  },
];
