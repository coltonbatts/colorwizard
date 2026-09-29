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
npm test -- --watch      # Watch mode

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

`/` (the simple web version, `components/simple/`) has a Plan view (press P): given the open picture, the active palette and a pile budget (5 / 8 / 12) it says "mix these N piles, here is what each is, here is where each goes". It is separate from the per-color solvers above and does not call `solveRecipe`. Everything is under `lib/paint/plan/`, pure and React-free, with the UI in `components/simple/` (`PlanPanel`, `usePlan`, `planFit` for wording, `planRender` for the repaint).

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
- `components/simple/planFit.test.ts`, `planRender.test.ts` (Plan view wording and repaint)
