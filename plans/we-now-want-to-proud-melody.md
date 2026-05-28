# Migrate image-tools to Tailwind v4 + shadcn/ui

## Context
The `image-tools` Next.js 16 app (static export, 7 client-side image utilities) was styled with a hand-written `app/globals.css`. The user asked to migrate it to **Tailwind CSS + shadcn/ui**. The goal is the same UI/behavior, now built on Tailwind utilities + shadcn components and theme tokens, so it matches the Vercel/shadcn design system and is easier to evolve.

## Status — already applied (code edits done, NOT yet built/verified)
Setup:
- Installed Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`, `postcss`) + `postcss.config.mjs`.
- Ran `npx shadcn@latest init -d` → it selected **Base UI** primitives, created `components.json`, `lib/utils.ts` (`cn()`), and wrote the theme into `app/globals.css`.
- Added shadcn components (in `components/ui/`): `button, card, select, slider, input, label, separator, checkbox`.

Styling (`app/globals.css`):
- Tailwind + shadcn theme imports + `@custom-variant dark`.
- `.dark` token values overridden with the **original brand palette** (bg `#0f1115`, card `#12151c`, border `#232834`, primary `#2f6bff`, muted-foreground `#9aa3b2`, …).
- Font fixed to a literal system stack in `@theme inline` (avoids the shadcn/Geist circular `--font-sans` gotcha).
- All layout classes (`.actionbar`, `.card`, `.settings`, `.field`, `.duo`, `.pane`, `.panel*`, `.editbar`, `.tool-group`, `.editopts`, `.workspace`, `.toolbar`, `.site-header`, `.hero`, `.tool-grid`, `.prose`, …) reimplemented via `@layer components { @apply … }` using theme tokens.
- Bespoke CSS kept as plain rules: `.checker`, `.canvas`, `.canvas-wrap`, `.crop-overlay`/`.crop-handle`, `.loupe`, `.swatch*`, `.svg-host`. Legacy CSS backed up at `app/globals.legacy.css.bak`.
- `app/layout.tsx`: `<html className="dark">`, removed Geist.

Components — raw primitives swapped to shadcn (verified by grep: no `className="btn"`/`"tool"`/`btn-primary` remain in `features`/`components`/`app`):
- `<button>` → `<Button>` (variant `default` for primary, `outline` for secondary, `secondary`+`size="sm"` for editbar tools, active tool = `default`).
- `<input type=range>` → `<Slider value={[n]} onValueChange={(v)=>set(Array.isArray(v)?v[0]:v)}>`.
- `<input type=number>` → `<Input>`.
- `<input type=checkbox>` → `<Checkbox onCheckedChange={(c)=>set(c===true)}>`.
- Native `<select>` intentionally **kept** (Base UI Select's value/label API is fiddly) and styled via `.field select` with Tailwind tokens — in `SvgTool` (Style/Simplify), `CompressTool`, `ResizeTool`.
- Files touched: `components/Dropzone.tsx`, all `features/{svg,compress,convert,resize,crop,favicon,background}/*Tool.tsx`. (`SiteHeader`, `SiteFooter`, `ToolPage`, `app/page.tsx` had no raw primitives — they use the ported layout classes only.)

## Remaining work (what this plan executes)
1. **Build**: `npm run build` (static export). Fix any issues, likely candidates:
   - shadcn Base UI prop types on `Slider`/`Checkbox` (`onValueChange`/`onCheckedChange` signatures) — already normalized, confirm they typecheck.
   - `Button` with `className="justify-start"` (cleanup toggle) and `size="sm"` icon sizing render correctly.
   - Tailwind `@apply` of any token that doesn't exist → fix the utility name.
   - Delete `app/globals.legacy.css.bak` once the new styles are confirmed (kept only as reference).
2. **Runtime verify** (dev server + Claude Preview MCP):
   - Home + a few tool pages render with the dark shadcn theme (Buttons, Sliders, Checkbox, Cards) and correct layout.
   - SVG worker still traces; a Slider/Checkbox/Select interaction updates state; Convert/Download still fire.
3. **SEO sanity**: styling shouldn't change metadata — spot-check one `out/<route>/index.html` still has its `<title>`/meta/JSON-LD and that `sitemap.xml`/`robots.txt` are present.

## Critical files
- `app/globals.css`, `app/layout.tsx`, `postcss.config.mjs`, `components.json`, `lib/utils.ts`, `components/ui/*`.
- `components/Dropzone.tsx` + `features/*/**Tool.tsx` (primitive swaps).

## Verification
- `next build` → 20 routes, TypeScript clean.
- `next dev` via Claude Preview: screenshot the home hub + one tool; push a test image through compress / a converter pair / image-to-svg; confirm shadcn theming + that downloads (Save dialog) still work.
- `grep -rn 'className="btn\|className="tool\b\|type="range"\|type="checkbox"' features components` → only intentional layout classes (`tool-group`, etc.) and zero raw range/checkbox.
