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
- Physics-based via Kubelka-Munk theory (spectral.js)
- Grid search: coarse 2% steps → fine 0.5% refinement around best candidate
- Escalates to 3-pigment if 2-pigment error > 1.5 deltaE (OKLab)
- Returns precise weights, `error` (deltaE), `matchQuality`, `predictedHex`
- Computationally intensive — caches Color objects by hex+tinting strength (`lib/spectral/adapter.ts`)

Both use the same 6-color limited palette defined in `lib/spectral/palette.ts` (Titanium White, Ivory Black, Yellow Ochre, Cadmium Red, Phthalo Blue, Phthalo Green). Phthalos have tinting strength 2.0; others 1.0. Palette changes require testing both solvers.

### Canvas System

`components/ImageCanvas.tsx` uses HTML5 Canvas with a transform matrix for zoom/pan — never modify image pixel data directly. Colors are sampled from original image data via `getImageData()`. ResizeObserver handles responsive sizing. Two highlight modes: solid (binary tolerance) and heatmap (gradient by similarity).

Heavy color processing runs in Web Workers via Comlink (`lib/workers/`).

### Data Pipeline

Build-time scripts generate static JSON consumed at runtime:
- `scripts/generate-static-data.mjs` extracts DMC floss from `scripts/source/dmcFloss.source.txt` → `public/data/dmc-floss.json` and copies `public/colornames.json` → `public/data/colornames.json`
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
