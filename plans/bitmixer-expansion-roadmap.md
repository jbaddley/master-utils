# BitMixer Expansion Roadmap: Universal Utility Hub

## 1. Project Overview

**Objective:** Expand BitMixer from a media-centric tool (Image, Video, Audio, QR) into a universal utility hub.

**Core Philosophy:** Privacy-first (client-side processing), high scannability, and frictionless "one-click" workflows.

---

## 2. Phase 1: The Document & Data Foundation

**Focus:** Capturing high-volume search traffic for daily productivity.

### PDF Manipulator Suite
- [ ] Merge, Split, and Reorder pages
- [ ] PDF to Image (JPG/PNG) and Image to PDF

### OCR (Text Extraction)
- [ ] Implement Tesseract.js (or similar) for browser-side text extraction from images/PDFs

### Data Transformation
- [ ] JSON Formatter/Validator with Tree View
- [ ] CSV to JSON and JSON to CSV converters
- [ ] Base64 Encoder/Decoder

---

## 3. Phase 2: Security & Privacy (The "Trust" Layer)

**Focus:** Tools that establish BitMixer as a safe, local-only environment.

### Metadata Scrubber (EXIF)
- [ ] Tool to strip GPS and camera data from images

### Privacy Redactor
- [ ] Canvas-based tool to manually black out sensitive text/regions on documents or screenshots

### Secure Generator
- [ ] Password Generator (Random vs. Diceware/Memorable)
- [ ] UUID/GUID Generator for developers

### URL Inspector
- [ ] URL Unshortener (to preview destination)
- [ ] URL Encoder/Decoder

---

## 4. Phase 3: Developer & Content Workflow

**Focus:** Niche tools that drive repeat usage from professionals.

### The "Case" Factory
- [ ] Convert text between: camelCase, snake_case, PascalCase, slug-case, and Title Case

### Code Formatter
- [ ] Prettier-integrated box for HTML, CSS, and JS cleanup

### Social Media Previewer
- [ ] Character counter for X, LinkedIn, and Meta
- [ ] "Screenshot-to-Mockup" (Wrap images in device frames)

### Diff Checker
- [ ] Side-by-side text comparison with highlight delta logic

---

## 5. Phase 4: Design & UI Micro-Tools

**Focus:** Lightweight assets for creators.

### Color Toolbox
- [ ] WCAG Contrast Checker (Accessibility)
- [ ] HEX/RGB/HSL Converter

### SVG Generator
- [ ] Mesh gradient and geometric pattern CSS generator

### Favicon Generator
- [ ] Single image upload to multi-size .ico and Apple Touch icon zip

---

## 6. Implementation Standards

To be followed by the agent for all new tools:

- **Architecture:** Prioritize Client-Side Processing (Wasm/WebWorkers). Files should never leave the user's machine unless strictly necessary.
- **UI/UX:** Every tool must have a "Copy to Clipboard" button and a "Download" button.
- **SEO:** Each tool page requires unique Meta Tags and a H2 section explaining "How to use [Tool] without uploading files."
- **Performance:** Lazy-load libraries (like Tesseract or PDF.js) only when the specific tool is accessed to keep the initial BitMixer load-time fast.

---

## 7. Success Metrics

- **Search Engine Visibility:** Increase in long-tail keywords (e.g., "Privacy-first PDF redactor")
- **Retention:** Increase in "Direct" traffic via bookmarks
- **Performance:** Maintain a Lighthouse score of >90 across all categories
