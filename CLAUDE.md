# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Next.js dev server (localhost:3000)
npm run dev:tauri        # Dev server wired for Tauri desktop

# Build
npm run build            # Static export to out/ (runs generate:data prebuild + postbuild cleanup)
npm run tauri:build      # Build macOS DMG (requires out/ from npm run build)

# Testing
npm test                 # Run all Vitest tests
npm test -- <path>       # Run specific test file
npm test -- --watch      # Watch mode (tests are `lib/**/*.test.ts` and `components/**/*.test.ts` only; JSX renders with the automatic runtime, see vitest.config.ts)

# Quality
npm run lint             # ESLint
npm run validate:paints  # Validate paint palette data integrity
npm run benchmark:paint  # Per-color recipe accuracy (see docs/paint-accuracy-audit.md)
npm run benchmark:plan   # Whole-picture plans (see docs/paint-plan-audit.md); --algo naive|library, --palette core6|zorn, --reference, --photos

# Data
npm run generate:data    # Generate static DMC floss + color names JSON to public/data/
```

## Architecture

### Web vs. Desktop Split

The app deploys from a single Next.js codebase as both a web app (Vercel) and a macOS desktop app (Tauri). `next.config.js` uses `output: 'export'` for static generation. The `postbuild` script (`scripts/clean-desktop-export.mjs`) strips web-only routes (`/pricing`, `/dashboard`, `/settings`, `/color-theory`, `/trace`) from `out/` before Tauri bundles it. Tauri serves `out/` as `frontendDist` — no Node server runs in the desktop app.

Cloud features (Firebase auth, Stripe) are conditionally loaded when `OPEN_SOURCE_MODE` is not set — import them lazily via `lib/auth/` to avoid dead code in offline builds.

### State Management

Zustand stores in `lib/store/` are the primary state layer. Key stores:
- `useSessionStore` — active sampled color, pinned colors, highlight/value modes
- `useCanvasStore` — image data, reference/surface overlays, zoom/pan transforms
- `usePaletteStore` — user-saved palettes
- `useCalibrationStore` — color calibration settings
- `useLayoutStore` — sidebar collapsed state, mobile nav

Use `useShallow` for object selectors to avoid unnecessary re-renders.

### Two Paint Recipe Systems

The app has **two separate** recipe generators — don't conflate them:

**Traditional** (`lib/colorMixer.ts`):
- HSL-based rule engine, instant, qualitative
- Returns steps like "mostly Titanium White + small amount of Yellow Ochre"

**Spectral** (`lib/paint/solveRecipe.ts`):
- spectral.js mixing (Kubelka-Munk-inspired). Concentration ∝ (weight × tintingStrength)² × luminance, so weights are spectral.js "factors", not volume fractions.
- Coarse 2% grid over 2 pigments, then 3 (skipped only when 2 already match within 0.3 OKLab), each refined by Nelder-Mead (`nelderMead.ts`). A 4th pigment (5% grid + refinement) is used only if it gains ≥1 OKLab ΔE over the best 3.
- Then `lib/paint/parts.ts` finds the simplest whole-part recipe (≤16 parts) within +1 ΔE of the unrounded optimum. `recipe.error` is the printed recipe's error; `unroundedError` is the optimum; `paintable`/`totalParts`/`ingredient.parts` describe the ratio (`paintable: false` means no clean ratio, percentages only).
- `matchQuality` is banded on CIEDE2000 of the predicted swatch (`error00`: <1 / <2.5 / <5), like the thread match. `error` is OKLab ×100.
- Caches Color objects by hex+tinting strength (`lib/spectral/adapter.ts`, unbounded).
- Tinting strengths in `lib/spectral/palette.ts` (white 1, black 5, ochre 0.9, cad red 1.5, phthalo green 8, phthalo blue 10) are hand-set and NOT validated against real paint; a self-consistent ΔE benchmark cannot detect a wrong one.

**Default palette**: `lib/spectral/palette.ts` defines seven pigments; the solver defaults to the Core 6 (Titanium White, Ivory Black, Yellow Ochre, Cadmium Red, Phthalo Blue, Phthalo Green) via `CORE_SIX_PIGMENT_IDS`. `colorMixer.ts` hard-codes those six names. Users can instead solve with their own palette (`SolveOptions.pigments` from `lib/paint/palettePigments.ts`, stored in `usePaletteStore`, custom tubes carry their own hex and strength) or the Winsor & Newton catalog (`useCatalog`, `usePaintPaletteStore`).

Accuracy: `npm run benchmark:paint` (add `--skip-baseline` for a fast run) measures both engines; `lib/paint/benchmark/benchmark.test.ts` holds ratchets that only tighten. Findings and method: `docs/paint-accuracy-audit.md`. Solver or palette changes must keep both solvers' tests and the ratchets passing.

### Whole-Picture Paint Plan

`/` (the simple web version, `components/simple/`) has a Plan view (press P): given the open picture, the active palette and a pile budget (5 / 8 / 12) it says "mix these N piles, here is what each is, here is where each goes". It is separate from the per-color solvers above and does not call `solveRecipe`. Everything is under `lib/paint/plan/`, pure and React-free, with the UI in `components/simple/` (`PlanPanel`, `usePlan`, `planRender` for the repaint, `PlanCard` for the printed card). The wording lives in `lib/paint/plan/planFit.ts` and `lib/paint/paintFit.ts` (moved out of `components/simple/` so the exports can share it; do not copy strings into components). Piles are numbered Pile 1..N, dark to light, and every surface (panel, card, Procreate palette) uses those numbers.

How a plan is made (`plan.ts`, details and every measured choice in `docs/paint-plan-audit.md`):
- `library.ts` builds, per palette, every reduced whole-part recipe of ≤4 pigments and ≤16 parts (37k for the Core six, ~130 ms, cached) with the spectral.js swatch it predicts. **Plans are measurable-only by construction**: no pile lacks a clean ratio (the solver's 13% "no clean ratio" cases are avoided, at some accuracy cost on pale tints; longer ratios would gain ~0.23 ΔE00 overall).
- `select.ts` picks piles by k-medoids over that library, minimizing area-weighted ΔE00 (CIEDE2000, the metric users see) plus a price per part (`alpha` 0.005) and per extra tube (`beta` 0.1), with a value-weighted objective (`kL` 0.65). No randomness, no solver calls; same picture, palette and budget give the same plan.
- `derive.ts` lets a pile be "k parts of another pile + d parts of one pigment" (one level, ≤4 + 4 parts), which reaches finer tints and needs fewer parts. It leans on the model's factors-not-volumes assumption a second time.
- `picture.ts` plans a whole picture and returns a per-pixel pile map and a "visibly off" (>5 ΔE00) mask; `plan.worker.ts` runs it off the main thread (`getPlanWorker`) on a ≤512 px copy. The palette comes from `resolvePalettePigments(usePaintPalette().colors)`.

Scored against spectral.js's forward model, like everything else here: a plan's ΔE00 shows how well the piles repaint the picture on screen, **not** that real paint would match. The plan UI must keep saying so (`MODEL_CAVEAT`), and its headline is chosen from the pixel-level share of the picture that is visibly off, never from pile labels alone. Do not touch the tinting-strength constants.

Benchmark and ratchets:
- `npm run benchmark:plan` plans every picture in `lib/paint/plan/fixtures/` at each budget. The corpus is nine generated pictures (no real photographs yet; drop 8-bit PNGs in that folder and they are reported as a separate `photo` group, see its README). `--algo naive` is the frozen baseline (OKLab k-means plus one solve per cluster); `library` is the current algorithm.
- `lib/paint/plan/benchmark.test.ts` holds ratchets that may only tighten. Changing `solveRecipe`, `palette.ts` or the library/derive/select code means re-running it, and `npm run benchmark:paint -- --skip-baseline` if the solver was touched.
- Current numbers (Core six, 9 generated pictures, 5 / 8 / 12 piles): mean ΔE00 5.30 / 4.32 / 3.89, 38 / 30 / 25% of the picture visibly off, p50 178 / 204 / 242 ms. Known weak spots: pale blues and yellow-greens (the 16-part library), saturated pictures the palette cannot reach (`sunset`), tail error and value error slightly worse than the naive baseline.

### Plan exports: Procreate palette and printable card

Both are built from **one model**, `describePlanForExport(picturePlan, {paletteName, paletteLabel?, pictureName?})` in `lib/paint/plan/export.ts`: every pile once (number, predicted swatch, target, share, recipe text, parts, fit, base), the headline/notes/facts, the tubes used, the mix order, and the caveats. Pure, no dates, deterministic. Add fields there, never in an exporter. Rules the model enforces (all tested in `export.test.ts`):
- **Mix order** (`mixOrderOf`): a pile mixed from another comes after its base; otherwise lowest number first (so no derived piles reads 1, 2, 3, ...). A malformed plan (loop, base out of range) is finished in number order, never dropped.
- **A plan can use fewer piles than the budget**: say "8 of 12 piles" (`pileCountLabel`), never pad.
- **A base no pixel uses** (area 0, "only used to mix Pile N") has `fit: null` and share "—": its target is its own swatch, so a match verdict would compare a color with itself. (The panel still shows "Very close" for it; see Open edges.)
- **Caveats travel with every export** because a printed page or file cannot be hovered or scrolled: `MODEL_CAVEAT` (`paintFit.ts`), `PLAN_CAVEAT_COPY`, `DERIVED_CAVEAT` (only when a pile is derived), `PARTS_CAVEAT`, `PRINT_CAVEAT` (all `planFit.ts`). Reuse them verbatim, do not paraphrase. Parts are the model's factors, not volumes: the card gets a blank "One part = ______" line, never a converted amount. Changing any of this wording needs the owner's OK.

**Procreate palette** (`procreatePalette.ts`, button in `PlanPanel`): one swatch per pile in pile order (swatch N is Pile N), named "<picture> · 8 piles" (title cut at 28 characters), at most 30 (Procreate's limit; extras are cut and the status says how many), written by `createSwatchesFile`/`downloadSwatchesFile` in `lib/procreateExport.ts`.
- **Swatches are the predicted colors, not region averages**: measured on the corpus, the average color of what a pile paints is more than ΔE00 5 from the pile's swatch for about 17% of the picture (mean gap 2.7–3.1), i.e. colors the piles cannot mix.
- **No tier gating, on purpose.** `hooks/useExportToProcreate.ts` caps the free tier at 5 colors via `getFeatureLimit('exportToProcreate')`; the plan calls the exporter directly, because the simple version has no tiers and a 12-pile plan must not be silently cut to 5. Ask the owner before adding any gating.
- **The .swatches format is UNVERIFIED against a real Procreate.** No official spec exists. We write the "thin" format: a zip whose only entry is `Swatches.json` (exact name and case), `{name, swatches: [{hue, saturation, brightness, alpha, colorSpace}] padded with null to 30}`, HSB as 0..1 (unit-tested against known colors and a 560-color round trip within one 8-bit level). There are no per-swatch names in any public example, so recipes cannot ride along; the pile number is the swatch's position and nothing else.
- Public evidence (third-party reports, not Procreate docs: `szydlovski/procreate-swatches` issue #1, 2021, and a 2024 comment there): the thin format imported on Procreate 5.1.8; a Procreate-made file also carries `origin`, `colorModel`, `components` (sRGB 0..1 RGB), `version: "5.0"`, a `colorProfile` hash and a top-level `colorProfiles` block with an embedded sRGB IEC61966-2.1 profile (the hash is base64 of the SHA-256 of the profile bytes, checked). Nobody has confirmed either format on a current Procreate.
- **Decision (2026-09-28): keep the thin format until the owner has tested both variants on an iPad** (file A = what the button writes, file B = with the embedded profile; both were handed over). If Procreate reads our numbers as Display P3 instead of sRGB, colors shift by mean ΔE00 ≈ 1.8 (max 3.6 on the Core-six piles; pure red 6.8, gray 0). Do not claim it works until that test is back.

**Printable card** (`card.ts`, `labels.ts`, `PlanCard.tsx`, `planCardImages.ts`, `planCard.module.css`; "Print card" button in `PlanPanel`): the browser's own print (`window.print()`, Save as PDF comes with it), no dependency.
- `buildCard(picturePlan, model, {dateText})` is the pure page: header line, headline and numbers, both pictures' size, the number badges, the piles that got no badge, mix-order line, a cell per pile (two columns, column-major), caveats. The date is passed as text.
- `placeLabels` (`labels.ts`) puts a numbered badge on each pile's region. A badge hides its own pixels, so a spot is scored by **purity**: the share of the disc around it (badge plus ring, 1.4 radii) that belongs to the pile, at least 0.6, with the badge center on a pixel of its own pile, in the middle of the best spot; badges never touch. A pile with no such spot is listed ("Pile 1, 3, 11 have no room for a number on the picture."), never crammed in. Chosen by measurement: requiring the whole badge inside its pile numbered only 66% of piles on real images; 0.6 purity numbers 88% (generated) / 90% (macOS wallpaper images), 80% of piles at 12 piles in the final renders, 94% at 5 and 8. Thin bands (near-white `high-key`: 3 of 11 numbered) are the known weak case.
- **How it prints**: `PlanCard` is portaled to be a direct child of `<body>` only while a print is under way (created on click, removed on `afterprint`). Page rules (inline `<style>` in `PlanCard`, since they name `html`/`body`) hide every other child of `<body>` in print; the simple app is `position: fixed; inset: 0`, which prints clipped or blank. On screen the card is laid out off screen and `visibility: hidden` so its height can be measured. Swatches and badges are SVG and the pictures are `<img>`, so nothing depends on "background graphics"; every pile has its number as text and swatches have a border, so it survives grayscale.
- **Geometry** (`CARD` in `card.ts`, CSS px): 718 × 980 is what 10 mm margins leave on the smaller of Letter and A4 in each direction (A4 is narrower, Letter is shorter). Pictures are at most 349 × 240 inside a 1 px frame (two frames and the 16 px gap fill 718; 351 overflowed A4 by 4 px for pictures wider than 1.46:1). If a plan's notes make the card taller than the page, `PlanCard` zooms it down to fit; without that a card with long notes is 2 pages.
- **Keep the Print card button enabled while a card is open** (a second press is ignored): disabling a focused button drops keyboard focus to `<body>`.
- The repaint on the card is unhatched (the numbers under the headline carry how far off it is); the original is a JPEG of at most 1200 px; everything is drawn in the browser, nothing is uploaded.

### Verifying the exports

- Unit tests: `export.test.ts`, `procreatePalette.test.ts` (unzip and parse the file), `labels.test.ts` (brute-force geometry, invariants on real plans and a busy noise picture), `card.test.ts`, `components/simple/PlanCard.test.ts` (server-rendered markup). Several were mutation-checked (turning the rule off fails them); keep that habit for new invariants.
- Print, for real: drive the installed Chrome with Playwright (already a devDependency; `chromium.launch({channel: 'chrome'})`, no browser download): load a picture with `page.setInputFiles('input[type=file]', path)`, press `p` after a "Plan" button exists, pick a budget and wait for the summary section's `aria-busy="false"` (a stale result still shows the old headline and an enabled button while re-planning, which races), stub `window.print`, click "Print card", `page.emulateMedia({media: 'print'})`, then `page.pdf({format, printBackground: false, preferCSSPageSize: true})` and count pages with `pdfinfo`; `pdftoppm -png -r 96` gives 816×1056 (Letter) / 795×1124 (A4) images and `-gray` a grayscale check. `printToPDF` fires `afterprint`, which removes the card, so click Print card again for each paper. Last full run: 11 pictures × 5/8/12 piles × Letter and A4 = 66 PDFs, all one page, tightest 24 px spare (sunset, 12 piles, Letter). Real photographs are not in the repo; the macOS wallpapers in `/System/Library/Desktop Pictures` (`sips -s format png -Z 512`) make busy test images.
- **Not verified, do not claim**: the real print dialog, a physical printer, Safari or Firefox print, a custom margin chosen in the dialog, and printing without the button (Cmd+P in Plan view prints the clipped app).
- Browser pane: the one `Uncaught SyntaxError: Invalid or unexpected token` on every page load is not ours (it appears with our code stashed). Any other console error is.

### Open edges (plan exports and Plan view)

- The panel shows a fit label ("Very close") for a base no pixel uses; the exports do not. Proposed: hide it in the panel too (changes plan wording, owner's call).
- Near-white, banded pictures number few piles on the card; leader lines would fix it and add clutter (undecided).
- The smallest card type is 9 px (about 6.75 pt); legible in a 300 dpi crop, unchecked on paper.
- Total parts counts each pile once; a base is not sized for the batches drawn from it.
- Procreate format: see above, unverified.

### Working in this repo

- Ignore `.claude/worktrees/` (stale copies pollute grep). Stage files by path, never `git add -A`.
- Ask the owner before: adding a dependency, gating anything behind Pro, changing headline bands or plan wording, touching the desktop app, publishing anything, pushing.
- Do not touch the DMC data pipeline, the desktop-only routes, the tinting-strength constants, or the solver/plan algorithms while working on exports; if an export seems to need it, stop and re-run `npm run benchmark:plan` and `npm run benchmark:paint -- --skip-baseline` to prove nothing regressed.

### Canvas System

`components/ImageCanvas.tsx` uses HTML5 Canvas with a transform matrix for zoom/pan — never modify image pixel data directly. Colors are sampled from original image data via `getImageData()`. ResizeObserver handles responsive sizing. Two highlight modes: solid (binary tolerance) and heatmap (gradient by similarity).

Heavy color processing runs in Web Workers via Comlink (`lib/workers/`).

### Data Pipeline

Build-time scripts generate static JSON consumed at runtime:
- `scripts/generate-static-data.mjs` enriches `scripts/source/dmc-threads.json` → `public/data/dmc-floss.json` + `dmc-families.json` and copies `public/colornames.json` → `public/data/colornames.json`
- DMC publishes no color values. `scripts/source/dmc-threads.json` holds the classic thread names in color-card order (family ladders depend on that order) with colors measured from DMC's own product photos. Refresh the colors with `node scripts/measure-dmc-swatches.mjs` (network; output is committed). Threads whose photos were unreliable carry `confidence: low`, and the UI labels them approximate.
- This script runs automatically as `predev` and `prebuild`

### Color Spaces

- Canvas input: sRGB hex
- Mixing computations: spectral reflectance space (spectral.js)
- Perceptual comparisons: OKLab deltaE
- Traditional recipes: HSL analysis

### Test Locations

Tests live alongside source with `.test.ts` suffix:
- `lib/spectral/adapter.test.ts`
- `lib/paint/solveRecipe.test.ts`
- `lib/paint/plan/*.test.ts` (library, selector, planner ratchets in `benchmark.test.ts`, worker-free `picture.test.ts`)
- `lib/paint/plan/planFit.test.ts`, `lib/paint/paintFit.test.ts` (wording), `components/simple/planRender.test.ts` (Plan view repaint)
- `lib/paint/plan/export.test.ts` (shared export model, mix order), `procreatePalette.test.ts` (unzip-and-parse, HSB units), `labels.test.ts` (badge placement), `card.test.ts` (card model), `components/simple/PlanCard.test.ts` (card markup, rendered with `react-dom/server`)
