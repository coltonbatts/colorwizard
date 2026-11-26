# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Next.js dev server (localhost:3000)
npm run dev:tauri        # Dev server wired for Tauri desktop

# Build
npm run build            # Static export to out/ (runs generate:data prebuild)
npm run tauri:build      # Build macOS DMG (requires out/ from npm run build)

# Testing
npm run test:fast        # Run unit/component tests without `**/benchmark.test.ts` ratchets (fast dev loop)
npm test                 # Run all Vitest tests (use `npm test -- --run` for the full CI suite incl. benchmark ratchets)
npm test -- <path>       # Run specific test file
npm test -- --watch      # Watch mode (tests are `lib/**/*.test.ts` and `components/**/*.test.ts` only; JSX renders with the automatic runtime, see vitest.config.ts)

# Quality
npm run lint             # ESLint
npm run typecheck        # tsc for the app, then tsconfig.test.json for the test files too (CI runs this)
npm run validate:paints  # Validate paint palette data integrity & manifest checksum/counts (CI runs this)
npm run unreachable:check # Verify no new unreachable source files outside scripts/unreachable-baseline.json (CI runs this)
npm run benchmark:paint  # Per-color recipe accuracy (see docs/paint-accuracy-audit.md)
npm run benchmark:plan   # Whole-picture plans (see docs/paint-plan-audit.md); --algo naive|library, --palette core6|zorn, --reference, --photos

# Data
npm run generate:data    # Generate static DMC floss + color names JSON to public/data/
```

## Architecture

### Web vs. Desktop Split

The app deploys from a single Next.js codebase as both a web app (Vercel) and a macOS desktop app (Tauri). `next.config.js` uses `output: 'export'` for static generation. The routes are `/` (simple app on the web, workbench in Tauri; see "First load" below), `/simple`, `/thread` (the simple app opened on DMC Thread Studio, see below) and `/workbench`. Tauri serves `out/` as `frontendDist` — no Node server runs in the desktop app — and `TauriAppShell` redirects the web-only `/simple` and `/thread` routes back to `/`.

**First load (2026-11-22).** Keep the web welcome in the static HTML and the first-load JS small:
- `app/page.tsx` chooses at build time. `COLORWIZARD_DESKTOP=1` (set by `scripts/build-desktop.mjs`, `scripts/tauri-dev.mjs` and `npm run dev:tauri`) renders `HomeSwitch`, which outputs nothing until mount and then opens the workbench; desktop behaviour is unchanged. Without the flag (Vercel, `npm run build`, `npm run dev`) it renders `WebHome`: `SimpleApp` server-rendered into `out/index.html`, which still switches to the workbench after mount if it finds itself inside Tauri. A desktop build made without the flag would open the simple app first, so keep the flag in every desktop entry point.
- `SimpleApp` loads the canvas, color readout, Plan, Process, Thread Studio and phone Thread view with `next/dynamic`. Canvas and readout are fetched after the `load` event once idle. The Process hooks live in `useProcess.ts` so `ProcessPanel` can load lazily. jszip is imported inside `createSwatchesFile`. Do not add static imports of these from `SimpleApp`.
- Fonts come from fontsource's combined stylesheets (`400.css` etc.), which carry `unicode-range`. The per-subset files (`latin-400.css`) have none, and importing them made every subset download.
- The welcome image has a 768 px variant (`welcome-pigment-cutout-768.webp`) through `srcSet`. It only helps screens below about 1.9× density; 2× and 3× phones still fetch the 1536 px file.
- Measured with Playwright and Chrome (Slow 4G, 4× CPU, 412×823 at 2×, median of 5): `/` first paint 2.19 → 0.89 s, LCP 4.09 → 2.93 s, Next first-load JS 272 → 189 KB. The remaining LCP is the 146 KB welcome image sharing the connection with the JS. A lighter image is a design call. About 103 KB of first-load JS is React and Next itself.
- The desktop export was checked as files (`npm run build:desktop`: no welcome in `index.html`, relative asset paths) and in Chrome with a stubbed Tauri runtime. **Not verified**: the real Tauri app (dev or bundled).

There is no cloud code: accounts, Supabase, Stripe and email were removed (2026-11-10) because nothing used them. The app needs no environment variables. Tiers are local only (`lib/hooks/useUserTier.ts`: desktop is Pro, web is free). `supabase/migrations/` is kept as a record of the old `user_profiles` table.

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

**Earth tubes (2026-11-23, owner approved)**: `EARTH_TUBES` in `palette.ts` adds Burnt Sienna (#6E2E1C, strength 1.2) and Burnt Umber (#45301F, 1.5). They are in `PALETTE_MAP`, so a saved palette can name them, and they show as Add chips in the web "Your paints". They are kept out of `PALETTE` because the desktop MixLab draws a slider for every `PALETTE` pigment. Raw Umber's hex went from #735C44 (a light grayish tint that could not make darks) to #45392B, as it looks squeezed out. Its strength is unchanged. That hex is shared, so desktop mixes with Raw Umber change too (not checked in the desktop app). None of these values is measured from real paint.
- Why: the Core six cannot mix a dark, warm, yellow-leaning brown (Ivory Black kills the color, Cadmium Red turns it maroon). On the owner's reference (a dark ground, L* 10, C* 8.3) the best Core six mix reached C* 4.1, and the 12-pile plan was 26% visibly off. With either earth tube it was 3%, and the ground's hue came out right.
- `lib/spectral/palette.test.ts` checks that both tubes reach dark warm browns the Core six cannot (≤ 2.5 against > 4 ΔE00).

**Web default palette (2026-11-24, owner's call)**: on the web the default paints are the Core six plus Burnt Sienna, "Core six + Burnt Sienna" (`WEB_DEFAULT_PALETTE` in `lib/types/palette.ts`, same id as `DEFAULT_PALETTE`). `usePaintPalette` swaps it in whenever the active palette is the default, so the stored copy is never edited and nothing needs migrating; "Use my own paints…" starts from all seven. **The desktop workbench, the solver's no-options default (`CORE_SIX_PIGMENT_IDS`), the paint benchmark and the plan ratchets all stay on the Core six.** `getPaletteSolveOptions` now returns undefined only for a default palette holding exactly the Core six, so the web default solves by id. Fixed on the way: `paletteColorIds` mode used to drop the earth tubes silently (it filtered `PALETTE` only, and only `PALETTE` is pre-warmed in the adapter's cache), so a "My paints" set with Burnt Sienna and no custom tube got Core six recipes in the color readout while Plan used Burnt Sienna. It now filters `PALETTE` + `EARTH_TUBES` and registers the earth tubes.
- Measured (Core six → + Burnt Sienna): generated corpus 4.44 / 3.99 → 4.28 / 3.76 mean ΔE00 at 8 / 12 piles; ten real pictures about even (6.33 → 6.38 at 8, 5.82 → 5.72 at 12); the owner's reference 26% → 3% visibly off at 12. Cost: a single-color solve 113 → 218 ms (in Node), a plan about 20% slower, the library 37k → 53k recipes.
- Ratchet: `benchmark.test.ts` "web default palette" checks the web default beats the Core six on the corpus at 8 and 12 piles. `npm run benchmark:plan -- --palette web` reports it.

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
- Current numbers (Core six, 9 generated pictures, 5 / 8 / 12 piles): mean ΔE00 5.40 / 4.44 / 3.99, 39 / 30 / 25% of the picture visibly off, p50 179 / 206 / 235 ms. Known weak spots: pale blues and yellow-greens (the 16-part library), saturated pictures the palette cannot reach (`sunset`), tail error and value error slightly worse than the naive baseline. The library ratchets now plan 5, 8 and 12 piles, so more piles looking worse (beyond 0.05 ΔE00) fails a test at 12 too; the one recorded exception is `high-key` 5 → 8 (2.03 → 2.24, while its visibly-off share drops 5.7% → 3.0%).
- **Chroma-loss price (2026-11-23)**: plain ΔE00 selection turned saturated pictures gray (CIEDE2000 compresses chroma differences at high chroma), so piles are chosen by `pickCost` = ΔE00 + `chroma` × chroma the swatch loses (0.3 at first, now 0.2, see value equalization). Assignment and every score stay plain ΔE00. The derivation pass (`plan.ts`) applies each round's derivations biggest gain first; in pile order, an early small gain blocked a later large one and `landscape` got worse from 8 to 12 piles (6.45 → 6.68, now 6.05). The p95 (< 10.7) and busy-noise badge (≥ 0.4) ratchets were loosened for it with the owner's OK. Details: `docs/paint-plan-audit.md`, Step 3. The rest of the grayness is the palette: the default tubes have no violet, magenta or bright yellow.
- **Value equalization (2026-11-23)**: the owner found plans "muddled, dark, all one tone". Measured on ten real pictures: with area weighting, small value extremes (highlights, deepest darks) were merged into mid-value piles, so at 8 piles the lights came out 2.4 L* too dark on average (Big Sur 7.8) and the darks 1.9 too light; and with these tubes chroma comes with darkness, so the 0.3 chroma price pulled pale areas toward browner mixes. Piles are now chosen with each color weighted by area / (share of the picture in its 5-L* band)^`valueEqualize` (0.5, `selectionWeights` in `plan.ts`), with `chroma` 0.2. Real pictures: mean ΔE00 7.61 / 6.46 / 5.88 → 7.56 / 6.33 / 5.82 at 5 / 8 / 12, lights 2.43 → 0.74 L* too dark at 8, chroma kept 89% → 86–87%. The generated corpus got a little worse and five ratchets were loosened with the owner's OK (value error at 8 < 2.8, naive margin 0.45, `landscape` allowed 1.1 / 0.75 behind naive at 5 / 8, the `high-key` monotonicity exception, derived-vs-scratch margin 0.25); p95 at 8 came down to 10.11, so its limit is back to 10.5. A direct |ΔL*| price, plain-Lab picking and area^γ weights were tried and did nothing for value. Even an unconstrained 8-color posterization looks flat: part of the look is 8 flat piles, part is the palette (pale phthalo tints need less than 1 part in 16). Details: `docs/paint-plan-audit.md`, Step 4.
- **Real pictures score much worse than the corpus** (measured 2026-11-22 with the app's code on seven CC0 Met images, 512 px, Core six). Oil paintings with visible brushwork: 48–67% visibly off at 12 piles ("rough"/"poor repaint"; Cézanne *Card Players* and *Apples and Primroses*, Meléndez *Afternoon Meal*, van Gogh *Wheat Field with Cypresses*). Flat-color woodblock prints: 23–34% (Hokusai *Umezawa Manor* and *Storm below Mount Fuji* "fair" at 12; *Great Wave* "rough"). Full-color Thread Maps were "rough"/"poor" on all seven, 40–51% off even at 30 threads; monochrome Thread Maps rated close on six. The headline counts pixels, so texture pushes pixels past 5 ΔE00. The bands are the owner's; nothing was changed.

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
- Print, for real: drive the installed Chrome with Playwright (already a devDependency; `chromium.launch({channel: 'chrome'})`, no browser download): load a picture with `page.setInputFiles('input[type=file][accept="image/*"]', path)` (the backup restore adds a second file input), press `p` after a "Plan" button exists, pick a budget and wait for the summary section's `aria-busy="false"` (a stale result still shows the old headline and an enabled button while re-planning, which races), stub `window.print`, click "Print card", `page.emulateMedia({media: 'print'})`, then `page.pdf({format, printBackground: false, preferCSSPageSize: true})` and count pages with `pdfinfo`; `pdftoppm -png -r 96` gives 816×1056 (Letter) / 795×1124 (A4) images and `-gray` a grayscale check. `printToPDF` fires `afterprint`, which removes the card, so click Print card again for each paper. Last full run: 11 pictures × 5/8/12 piles × Letter and A4 = 66 PDFs, all one page, tightest 24 px spare (sunset, 12 piles, Letter). Real photographs are not in the repo; the macOS wallpapers in `/System/Library/Desktop Pictures` (`sips -s format png -Z 512`) make busy test images.
- **Not verified, do not claim**: the real print dialog, a physical printer, Safari or Firefox print, a custom margin chosen in the dialog, and printing without the button (Cmd+P in Plan view prints the clipped app).
- Browser pane: the one `Uncaught SyntaxError: Invalid or unexpected token` on every page load is not ours (it appears with our code stashed). Any other console error is.

### Open edges (plan exports and Plan view)

- The panel shows a fit label ("Very close") for a base no pixel uses; the exports do not. Proposed: hide it in the panel too (changes plan wording, owner's call).
- Near-white, banded pictures number few piles on the card; leader lines would fix it and add clutter (undecided).
- The smallest card type is 9 px (about 6.75 pt); legible in a 300 dpi crop, unchecked on paper.
- Total parts counts each pile once; a base is not sized for the batches drawn from it.
- Procreate format: see above, unverified.

### Canvas setup and painting packet (web, added 2026-11-22)

The oil-painting workflow: lock the canvas you are actually going to paint, transfer the reference to it by measurement, test mixes against real paint, and print the whole thing. "Canvas setup" is a toolbar button in the simple app's panel; nothing here exists in the desktop workbench.

- **The locked canvas is a crop, not a scale.** `lockCanvas(face)` stores inches (default 24 × 30, 0.125–240, `validFace`) and `centeredCrop` (`lib/paint/canvasSetup.ts`, pure) fits the reference inside that aspect, centered, no stretching; the crop is what Plan, Process and the value view work on, while Thread Studio and the plan card's "Original" keep the untouched source. Marks are stored **normalized to the full reference** (`referencePoint`) and converted to inches from the crop's top-left on read (`canvasPosition`), so re-locking a different face keeps them in the same place on the picture and any mark that falls outside the new crop reports "Outside the crop" instead of moving.
- **The 3-inch grid** (`gridSegments`, `columnLabel`, `drawTransferOverlay` in `components/simple/canvasTransfer.ts`) draws over the live canvas through `SimpleCanvas`'s `drawGuide` hook and into the printed sheet through the same function, so screen and paper cannot disagree. Columns are letters, rows are numbers, and each cell is at least 3 inches by construction except the last in each direction.
- **Landmarks** are placed by clicking the reference with the "Place landmark" tool; each gets a name, an index, and a measurement to ⅛ inch (`formatInches`) on both axes. **Mix trials** ("Sample mix trial") sample the average color of a small radius (1/240 of the short edge, at least 1 px) and run the solver for that hex through `solvePaint` (`components/simple/solvePaint.ts`; the worker-with-timeout-and-fallback that `ColorReadout` now also uses), against the **current palette**: `acceptedPalette` stores `paintPaletteKey(palette)`, so changing tubes marks an accepted trial "Review this trial with the current palette" instead of silently keeping a stale acceptance, and a trial cannot be accepted until its measured parts are written down.
- **Span checks** record the distance between two landmarks that are inside the crop; they are for catching a transfer that is drifting, not for drawing.
- **The draft is per picture and local**: `canvasPictureKey` is the SHA-256 of the file's bytes (the welcome demo uses its own `src`), and `storeCanvasDraft`/`loadCanvasDraft` read and write `{version: 1, pictureKey, draft}` under `colorwizard-canvas-setup-v1` in `localStorage`. Loading is strict: a wrong version, another picture's key, a bad face, duplicate ids or unreadable JSON returns null rather than a half draft. Reopening the same file restores the draft and opens the panel again ("Canvas draft restored."). Nothing is uploaded, and nothing outside `localStorage` holds it: clearing site data loses the draft unless the packet was printed.
- **The painting packet** ("Print painting packet" in Plan, `components/simple/CanvasTransferPages.tsx` + `canvasTransferPages.module.css`) prints the plan card followed by two pages: the **canvas transfer sheet** (the gridded reference rendered to a bitmap, the numbered landmark table in inches, span checks, and the two-figure pilot instruction) and the **oil mix worksheet** (one row per pile with its model recipe and a write-in column, the accepted/recorded trials with their starting mixes, the volume of one part, and the quarter-scale study size). It reuses `PlanCard`'s portal and print CSS via a `supplement` prop, so page rules and grayscale safety are the card's; the button is disabled while a trial recipe is still solving (`trials.pending`), because the worksheet would print "unavailable" for a mix that is a moment away.
- **`usePlan` carries an `inputKey`** (`budget:pigments`) so the panel can tell a stale result from a current one; `PlanPanel` now gates Save, Print card and Print packet on `state.status === 'ready'` instead of a separate `planning` flag. That was a real bug fix: a failed re-plan used to hide its error whenever an older result existed.
- **Files**: `lib/paint/canvasSetup.ts` (+ `.test.ts`), `components/simple/{CanvasSetupPanel,CanvasTransferPages}.tsx` (+ `canvasSetup.module.css`, `canvasTransferPages.module.css`), `canvasTransfer.ts`, `useTransferRecipes.ts`, `solvePaint.ts`, and the `SimpleApp`/`SimpleCanvas`/`PlanCard`/`PlanPanel`/`usePlan` changes.
- **Verified** (2026-11-22): `npm run typecheck`, `npm run lint`, the full suite (89 files / 838 tests) and `npm run smoke:canvas` against a dev server. The smoke drives a real 24 × 30 setup on one reference painting: lock a 1968 × 2460 px centered crop (8 × 10 grid), 10 landmarks and 7 trials, 2 spans, draft byte-stable across zoom, pan and two viewport sizes, restored after a reload and after opening another picture (which starts empty), the print packet carrying 17 landmark rows, 8 pile rows and an accepted trial, Letter and A4 PDFs written to `output/canvas-setup-smoke/`, a custom 5-tube palette dropping Cadmium Red from the packet, and a 390 px phone pass with no page or console errors. Reference: `output/oil-canvas-setup/packet-a4.pdf` (3 pages) from the same run.
- **Not verified, do not claim**: nothing has been printed on paper, checked with a ruler against a real canvas, or painted against real tubes. The trial recipes are model starting points, exactly like every other recipe here (they say "Model"), and the trial hex is a pixel average, not the artist's read of a patch. No iOS/Android, no desktop app, no pencil-transfer or projector workflow.
- **Open edges**: no undo (a misclick is a remove and a re-place), landmarks cannot be dragged, there is no way to export or import the draft itself, the packet only exists after Plan has a result, and the mark list is a plain list (no filtering on a picture with many marks).

### Unified color view (web `/`)

The web home (`components/simple/`) reads one color from top to bottom: swatch and name → "This color" → Keep (save, note, collections) → Paint → Thread, with a basis note under each result. Desktop (Tauri) still runs the separate workbench; none of this is wired there, and pins, the card deck and paint palettes are different, untouched stores. The owner decided (2026-10-13): web only for now; collections are made from a saved color; library export/import followed (below); rename is not built.

- **Profile** (`lib/color/profile.ts`, pure): `describeColor(hex)` gives the plain sentence, lightness/strength, hue name, technical values, and relationships as real, gamut-clamped OKLCH swatches (nearby: lighter, darker, softer, stronger, leans warmer, leans cooler; contrasting: opposite and two splits). A neutral gets lightness steps only; a step the screen cannot show is dropped, never repeated. `lib/color/parseColorInput.ts` accepts 3 or 6 digit hex for the "Type a color" entry. These are calculated screen relationships, not paint or thread matches; the old `getColorHarmonies` returns fixed wheel swatches and is not used here.
- **Basis** (`lib/color/basis.ts`, `lib/dmc/threadFit.ts`, `BasisNote.tsx`): every result is labeled `calculated` (relationships, paint) or `catalog` (name, thread) with how it was found and what could make the real thing differ. **`verified` is reserved: nothing may produce it until a physical check exists**, and `basis.test.ts` fails if any topic uses it or claims verification. Thread wording never says "exact" (DMC publishes no color values; ours are measured from DMC's product photos, some `approximate`). `MODEL_CAVEAT` stays verbatim. **Changing any of this wording needs the owner's OK.**
- **Library** (`lib/colorLibrary.ts`, pure): `SavedColor {id, hex, nameSnapshot, note?, collectionIds, createdAt, updatedAt, source?, attachments: {paint?: {kind: 'spectral', paletteName, recipe}, thread?: {brand: 'dmc', number, name, hex, deltaE00, colorConfidence}}}` plus `Collection {id, name, createdAt}`, stored as `{version: 2, colors, collections}` under `colorwizard-simple-library-v2` (browser origin only; the picture is not saved). One reference per hex: saving again updates it (same id, note, first-save date). Membership lives only on the color. Parsing is strict and throws on anything unreadable so the caller keeps the data and disables saving; never overwrite what cannot be read. **v1 (`colorwizard-simple-saved`) is read once when v2 is absent, migrated in memory, and never written or removed**; loading never writes. `kind: 'spectral'` is explicit so a qualitative recipe can never be mistaken for it. Notes are capped at 1000 characters; collection names at 40 (50 collections).
- **Backup and restore** (`lib/libraryBackup.ts` pure, `components/simple/LibraryTools.tsx`): "Download a backup" writes `colorwizard-colors-YYYY-MM-DD.json`, `{format: 'colorwizard-library', formatVersion: 1, exportedAt, library}` wrapping the v2 library (no pictures). "Restore from a backup…" parses strictly (not JSON, not ours, newer version, damaged, over 5 MB are each refused whole with a reason; nothing is ever partly imported), shows what it will do, and writes only after Import. Restoring **merges and never deletes**: colors match by hex and the more recently updated one wins whole (ties keep yours; a replaced color keeps your id and the union of collections); collections match by name ignoring case; ids that collide are reissued; collections past the limit of 50 are skipped but their colors still import. Restore is disabled while saved data is unreadable, so it cannot overwrite it. Importing the same file twice changes nothing. Raising `formatVersion` needs a migration for old files. The tool wording ("Pictures aren’t included", "Nothing is deleted") is trust-related: owner's OK to change. The picture file input is the one with `accept="image/*"`; the backup input has `aria-label="Backup file"`.
- **Saving is enabled when the recipe and thread lookups have finished or failed**, so a color can be kept without a recipe if the solver fails; it then claims nothing about paint.
- **Contrast**: `--s-ink-3` on the paper is about 2.7:1. Text added with this view uses `--s-ink-2` (about 5.4:1). The older `.smallNote` (including the paint caveat) is still `--s-ink-3`; raising it is an owner call.
- **Tests**: `lib/color/profile.test.ts`, `lib/color/basis.test.ts`, `lib/colorLibrary.test.ts`, `lib/libraryBackup.test.ts`, `components/simple/{ColorUnderstanding,BasisNote,Collections}.test.ts` (server-rendered markup).
- **Browser check**: `scripts/smoke-core-flow.mjs` against a served static export (`npm run build`, serve `out/`, `COLORWIZARD_URL=http://localhost:3014 node scripts/smoke-core-flow.mjs`) at 1440×900, 1366×768, 768×1024 touch and 390×844 touch, including the understand, keep and collections scenarios and storage-failure/migration boundaries. If you reuse one browser profile across two builds, clear the HTTP cache between them (the static server sends no cache headers and a stale `index.html` points at the other build's chunks).
- **Verified**: a save made by the previous build (`e6475ffe`) in a persistent browser profile restored with the identical recipe in this build, v1 stayed byte-identical, and v2 appeared only on the first change; axe-core (WCAG 2 A/AA, best practices) found no violations on the welcome and the typed/saved/collection views at desktop and phone width. **Not verified, do not claim**: real iOS/Android/Safari, the installed Tauri app, any physical paint or thread match, and that people can use it unaided (plan: `Studio Ops/plans/colorwizard-unassisted-sessions.md`).
- **Not built**: a color-question mechanism (any future answerer should return text plus `{hex, role}` swatches that open in this view with basis labels), a compare view, name search, collection rename, desktop adoption, a way to download unreadable saved data as it is for rescue, saving Plan piles.

### Welcome demo (web `/`)

"Try a demo picture" opens a real picture with a first sample already taken (`lib/demoPicture.ts`, called from `openDemo` in `SimpleApp`; `openPicture` returns the buffer it opened). The picture is Hokusai's *Umezawa Manor in Sagami Province* (The Met, CC0, the Met's scan via Wikimedia Commons), `public/images/demo/hokusai-umezawa.webp`, 1280 × 879. It was chosen by measurement (see the plan's known weak spots): of seven CC0 candidates it is the only one rated "A fair repaint" at the default 8 piles (28–29% off when chosen; 30% since the chroma-loss price). Since value equalization (2026-11-23) it read "A rough repaint" at 8 piles (31.6% off). **With Burnt Sienna in the web default (2026-11-24) it reads "A fair repaint" at 8 piles again, only just (29.7%; the band ends at 30%), and 19% off at 12**; its monochrome Thread Map is close. Its full-color Thread Map still reads "A broad thread map". The first sample is a flat cream cloud at (0.08, 0.43), averaged 7 × 7: #DAC49F, paint "Very close", DMC 3823 "Close in catalog". Changing the picture or the spot means re-measuring; `demoFlow` in the smoke script asserts the hex and the Plan headline. The welcome label ("Try a demo picture") and picture name ("Hokusai, Umezawa Manor (The Met)") were approved by the owner on 2026-11-22. The old flat Terracotta demo is gone from `/`. The smoke scenarios that needed a flat color now upload `terracotta.png`, and the workbench keeps its own Terracotta demo.

### Phone Thread view (web `/`, ≤760 px)

A bar at the bottom of the phone panel switches between "All details" (the unified color view) and "Thread" (`ThreadView.tsx`, `threadWorkspace` in `simple.module.css`). The choice is stored under `colorwizard-simple-phone-view`; the default is All details. It exists so a stitcher can sample with one hand without scrolling to the last section.

- **The card has one fixed height on purpose.** The stage follows the panel's size, so a card that grew would move the picture under the thumb between samples. Extras (how it was found, saved colors) scroll inside the card.
- **The last result is held dimmed until the next arrives** (`useThreadMatch().latest`), so the card never blanks; copy and save are off while it is dim.
- **Trying another thread does not open it as a color** (unlike the chips in the full readout): the sampled color stays in the comparison, and Save keeps the thread shown. So a color can be saved with a thread other than the nearest; the full readout then says "Saved with DMC x; the catalog now matches DMC y".
- Saving here passes no paint, and `saveColor` keeps any recipe already attached. Wording comes from `describeThreadFit` and `BasisNote`, as elsewhere; the "never exact" rule holds (`ThreadView.test.ts`).
- The light-to-dark row appears only when the thread's family has more than one shade: 68 of 344 families do. That is the catalog, not a bug.
- **Browser check**: `threadFlow` in `scripts/smoke-core-flow.mjs` (390×844 and 320×553 with touch). **Not verified**: real iOS/Android/Safari, reach on a physical phone.
- Since Thread Studio (below), the phone Thread view has a sub-bar with Match / Map / Browse / Tray. Match is still `ThreadView`; the other three render `ThreadStudio` with its own tabs hidden.

### DMC Thread Studio and Thread Map (web, added 2026-11-20/21)

A thread workspace for needle painting. It is the `thread` section of `SimpleApp` (`AppSection = 'color' | 'thread'`): the "Thread" button in the desktop toolbar, the phone Thread view, and `/thread` (`app/thread/page.tsx`, `<SimpleApp initialSection="thread" />`), which also works with no picture open (`standalone` layout). Desktop (Tauri) does not have it. Eight commits, `a2b4f080`..`69aa48e2`; there is no Studio Ops task or design doc for it, so the code and this section are the record.

**Thread Studio** (`components/simple/ThreadStudio.tsx`, `threadStudio.module.css`; helpers in `lib/dmc/studio.ts`, pure). Four tabs:
- **Match**: the thread for the sampled color, with value notes from the picture (`computeImageValueContextFromCanvas`), a shading run, the family's light-to-dark ladder, and "Also close".
- **Map**: the Thread Map (below). It needs an open picture.
- **Browse**: search and the color card across all 488 catalog threads (`searchDmcThreads`, `BROWSE_GROUPS`), grays split warm / neutral / cool (`threadTone`), closest substitutes, and a Bridge finder that looks for shades between two skeins in OKLab (`findBridgeThreads`).
- **Tray**: the threads you've pulled, with a grayscale value check (`analyzeValueGaps`: close / smooth / jump), notes, a "Need to buy" filter and list export (`formatThreadList`).

Where the studio keeps things:
- A **pull** is a collection in the saved-color library (`lib/colorLibrary.ts`). Saving a map's threads (`saveThreadMapPull` in `SimpleApp`) creates a collection and saves each thread as a `SavedColor` with a thread attachment. Deleting a pull keeps its colors in All.
- **Owned threads** ("my box") are `useDmcStore` (`stash` / `shoppingList`, persisted under `colorwizard-dmc-inventory`). The desktop `components/tabs/StitchTab.tsx` uses the same store code.

**Thread Map** (`lib/dmc/map/`, pure and React-free; UI in `ThreadMapPanel`, `useThreadMap`, `threadMapCanvas`, `threadMapRender`, `ThreadMapCard`). It turns the open picture into regions, one DMC thread per region. Slots are numbered 1..N **lightest to darkest**, which is the opposite of Plan piles (dark to light).
- **Modes** (`types.ts`): Full color uses 2–30 threads (default 12), with Fidelity "True to photo" or "Vibrant accents". Monochrome uses 2–12 threads (default 7) in one of four tones (warm, neutral, cool grays, sepia), as a lightness ramp (`monochrome.ts`).
- **How a map is made** (`engine.ts`):
  - The palette is fitted on a canonical 512 px copy with deterministic k-medoids over the catalog, using CIEDE2000 plus a fidelity weighting.
  - `buildThreadLadder` turns it into an ordered ladder, so the thread-count slider adds or removes one skein at a time instead of reshuffling the palette.
  - Pixels are then assigned at the Detail preset's size (Crisp 1024 / Painterly 640 / Broad 512 px). `smooth.ts` removes speckle (single stray pixels and tiny islands) at each preset's strength.
  - Locked threads stay fixed in the palette. "Prefer my box" gives owned threads a 1.75 ΔE00 bonus (`PREFER_BOX_DELTA_E_BONUS`).
  - Everything runs in `threadMap.worker.ts` (Comlink, `lib/workers/index.ts`).
- **Scoring**: scores are measured against the **original, unsmoothed** pixels, using CIEDE2000 to the thread's **catalog** color. The "visibly off" mask is >5 ΔE00 (`VISIBLE_THREAD_MISS`, the same threshold as Plan and `threadFit`).
  - Full color verdicts are banded on the share of the picture visibly off: <10% close, <30% fair, <60% rough, otherwise poor.
  - Monochrome verdicts are banded on mean OKLab ΔL: <0.045 close, <0.075 fair, otherwise rough.
  - There is no paint or physical model here. The only thing it predicts is the catalog colors, which come from DMC's product photos.
- **Swaps**: swapping a thread repaints that slot's exact region and re-scores it (`swapMapThread`, `applyThreadMapSwaps`; `swapOverrides` in full color, `monoSwaps` in monochrome). Assignment and smoothing are not rerun. The panel also has a hover preview and an A/B compare against the original thread.
- **Undo/redo** (`history.ts`, ⌘Z): slider drags are merged into one undo step. It covers the controls, locks and swaps.
  - Only mode, budgets, tone, detail, fidelity and "Prefer my box" are saved (`prefs.ts`, `colorwizard-simple-thread-map-prefs`, and a corrupt value is ignored). Locks, swaps and history are lost on reload.
  - `history.ts` mentions "Studio Save States", but none are built.
- **Rendering** (`contours.ts`, `threadMapCanvas.ts`): the slot map is turned into vector shapes whose shared edges are smoothed. Neighbouring regions share the same edge, so fills have no gaps and an outline draws each boundary once. These shapes become cached `Path2D`s drawn at `devicePixelRatio` under the stage camera, so the map stays sharp at any zoom. The canvas can also isolate one thread over the photo (tracing-paper, photo or paper backdrop) and zoom to that area.
- **Print** (`card.ts`, `ThreadMapCard.tsx`, `threadMapImages.ts`): a one-page card in two variants: the color map, or a black-and-white **Fabric Transfer Outline** that can be mirrored. It copies PlanCard's approach: the same 718 × 980 page, number badges placed by `placeLabels`, a body-level portal only while printing, and zoom-to-fit. Have/Need boxes are text, so it survives grayscale.
- **Wording**: wording lives in `mapFit.ts`. It never says "exact" or "verified" and flags `approximate` catalog colors. The caveats are `THREAD_MAP_CAVEAT_CATALOG`, `_REAL`, `_COPY`, `THREAD_MAP_PRINT_CAVEAT` and `THREAD_MAP_PRINT_NOTE`. Reuse them verbatim, like the plan caveats. Nobody has said whether changing them needs the owner's OK, so ask.

**Tests**: `lib/dmc/studio.test.ts`; `lib/dmc/map/{engine,smooth,contours,history,card}.test.ts`; `components/simple/{ThreadStudio,ThreadMapCard,threadMapRender}.test.ts`. They pass in the full suite (829 tests on 2026-11-22). There is no benchmark or ratchet for Thread Map quality.

**Not verified, do not claim**:
- No browser smoke covers it: `scripts/smoke-core-flow.mjs` has no Thread Studio or Thread Map scenario.
- No print run is recorded for the card (page count, Letter/A4, grayscale), and nothing has been checked on paper or fabric.
- Not checked on real iOS/Android/Safari, against physical skeins, or for performance at Crisp on large photos.
- Deployed (checked 2026-11-22): every commit `a2b4f080`..`69aa48e2` has a READY Vercel production deployment, and `colorwizard.app/thread` serves the newest Thread Map code. Nobody has clicked through Thread Studio or the Thread Map on the live site.

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
- `lib/dmc/studio.test.ts`, `lib/dmc/map/*.test.ts`, `components/simple/{ThreadStudio,ThreadMapCard,threadMapRender}.test.ts` (Thread Studio and Thread Map)
- `lib/paint/canvasSetup.test.ts` (crop fit, measurement conversion, eighth-inch formatting, strict draft load), `lib/spectral/{calibration,mixInvariants}.test.ts` (calibration curve and self-consistency of the mixer)
