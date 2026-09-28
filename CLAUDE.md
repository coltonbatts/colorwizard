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
