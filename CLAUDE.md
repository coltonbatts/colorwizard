# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ColorWizard is a Next.js application for sampling colors from images and generating realistic oil paint mixing recipes and DMC embroidery floss color matches. The app uses physically-accurate spectral paint mixing based on Kubelka-Munk theory via spectral.js.

## Development Commands

### Running the Application
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build production bundle
npm start            # Start production server
```

### Testing
```bash
npm test             # Run all Vitest tests
npm test -- <path>   # Run specific test file
npm test -- --watch  # Run tests in watch mode
```

### Code Quality
```bash
npm run lint         # Run ESLint
```

## Architecture

### Core Technologies
- **Next.js 15** with App Router (`app/` directory)
- **TypeScript** with strict mode enabled
- **Tailwind CSS** for styling
- **Vitest** for testing
- Path alias `@/` maps to project root

### Key Subsystems

#### 1. Color Mixing System
The application has TWO separate paint recipe generators:

**Traditional Recipe Generator** (`lib/colorMixer.ts`):
- Rule-based algorithm using HSL color analysis
- Works with a 6-color limited palette (Titanium White, Ivory Black, Yellow Ochre, Cadmium Red, Phthalo Green, Phthalo Blue)
- Returns qualitative mixing instructions ("mostly", "moderate", "small amount", "tiny touch")
- Used in the main color panel's "Paint Recipe" section

**Spectral Recipe Solver** (`lib/paint/solveRecipe.ts`):
- Physics-based using spectral.js and Kubelka-Munk theory
- Grid search algorithm that tests thousands of weight combinations
- Returns precise percentages and perceptual match quality (deltaE in OKLab space)
- Accounts for pigment tinting strength (Phthalos are much stronger than others)
- Used for generating accurate recipes with scientific backing
- Configuration:
  - Coarse grid search: 2% steps for 2-pigment combinations
  - Fine refinement: 0.5% steps around best candidate
  - Automatically tries 3-pigment mixes if error > 1.5 deltaE
  - Minimum weight threshold: 1% to exclude negligible amounts

The spectral solver is significantly more accurate but computationally intensive. It uses:
- **2-pigment search**: Tests all combinations of 6 pigments with weight grids
- **3-pigment search**: Only triggered if 2-pigment error exceeds threshold
- **Refinement**: Fine-tunes the best candidate with smaller step sizes

#### 2. Spectral Mixing Architecture (`lib/spectral/`)
- **adapter.ts**: Lazy-loads spectral.js, caches Color objects, provides clean API
- **palette.ts**: Defines the 6-pigment palette with hex values and tinting strengths
- **types.ts**: Shared types for pigments, recipes, and mix inputs
- **Performance**: Module and color caching prevents redundant object creation

The adapter pattern ensures spectral.js is only loaded when needed and all colors are cached by hex+tinting strength to avoid recreating spectral Color objects.

#### 3. Image Canvas System (`components/ImageCanvas.tsx`)
- HTML5 Canvas with transform matrix for zoom/pan
- ResizeObserver for responsive canvas sizing
- Color highlighting with two modes:
  - **Solid mode**: Binary matching within tolerance
  - **Heatmap mode**: Gradient based on similarity
- Pixel-perfect color sampling using `getImageData()`
- Keyboard shortcuts: spacebar for pan mode, +/- for zoom

#### 4. Color Theory Lab (`app/color-theory/`)
A separate educational section with components in `components/color-theory/`:
- ChromaMap: 2D visualization of color saturation/lightness
- ValueChromaMap: Alternative visualization approach
- ColorWheelDisplay & PhotoshopColorWheel: Hue selection interfaces
- MixAdjustmentGuide & MixLadders: Paint mixing educational tools

#### 5. DMC Floss Matching (`lib/dmcFloss.ts`)
- Database of 454 DMC embroidery floss colors
- Euclidean distance matching in RGB space
- Returns top 5 matches with similarity percentages

### Component Architecture

**Main App** (`app/page.tsx`):
- State management for sampled colors, highlight mode, active tab
- Two-panel layout: canvas on left, analysis panel on right
- Tab system: "Inspect" (color analysis) vs "Shopping List" (color extraction)

**Key State Flow**:
1. User uploads image → ImageCanvas receives image
2. User clicks pixel → Canvas samples color → Passes RGB/HSL/HEX to parent
3. Parent updates sampledColor state → ColorPanel re-renders
4. ColorPanel triggers both traditional and spectral recipe generation
5. User can select a color → Activates highlight mode in canvas

### File Organization
```
app/
├── page.tsx                    # Main color sampling app
├── color-theory/page.tsx       # Educational color theory tools
├── layout.tsx                  # Root layout
└── globals.css                 # Global styles

components/
├── ImageCanvas.tsx             # Canvas with zoom/pan/sampling
├── ColorPanel.tsx              # Color info display
├── PaintRecipe.tsx             # Traditional recipe display
├── MixLab.tsx                  # Interactive spectral mixing UI
├── DMCFlossMatch.tsx           # Thread color matching
├── ShoppingListPanel.tsx       # Image color extraction
└── color-theory/               # Educational components

lib/
├── colorMixer.ts               # Traditional HSL-based recipe generator
├── paint/solveRecipe.ts        # Spectral grid search solver
├── spectral/
│   ├── adapter.ts              # Spectral.js interface with caching
│   ├── palette.ts              # 6-color palette definitions
│   └── types.ts                # Shared spectral types
├── dmcFloss.ts                 # DMC thread database and matcher
├── colorUtils.ts               # Color conversion utilities
└── colorTheory.ts              # Color theory calculations
```

## Important Implementation Details

### Spectral Mixing Performance
The spectral solver can test 10,000+ combinations. Key optimizations:
- Module-level caching of spectral.js import
- Color object caching by hex+tinting strength
- Early termination if excellent match found
- Progressive refinement (coarse → fine grid search)

### Paint Recipe Generation
When adding features that generate recipes:
- Traditional recipes use `generatePaintRecipe(hsl)` from colorMixer.ts
- Spectral recipes use `solveRecipe(targetHex)` from paint/solveRecipe.ts
- Both return `steps` arrays for step-by-step mixing instructions
- Spectral recipes include `error` (deltaE), `matchQuality`, and `predictedHex`

### Testing
Tests are located alongside source files with `.test.ts` suffix:
- `lib/spectral/adapter.test.ts`: Tests spectral.js integration
- `lib/paint/solveRecipe.test.ts`: Tests recipe solver algorithm

Use `npm test` to run all tests. Tests use Vitest with node environment.

### Color Space Conversions
- Input colors are in sRGB (from canvas)
- Spectral mixing happens in spectral reflectance space
- Perceptual comparison uses OKLab deltaE (more accurate than RGB Euclidean distance)
- Traditional recipes use HSL for color analysis

### Limited Palette Philosophy
The app uses a constrained 6-color palette based on the Zorn palette concept. This limitation:
- Makes recipes practical for artists (no need for 50+ paints)
- Forces creative mixing solutions
- Cannot perfectly match all colors (especially bright yellows, pure magentas)
- Yellow Ochre is the warmest available yellow (no Cadmium Yellow)

### Tinting Strength
Pigments have different tinting strengths (from palette.ts):
- Phthalo Blue: 2.0 (very strong)
- Phthalo Green: 2.0 (very strong)
- Others: 1.0 (normal)

This means a small amount of Phthalo dominates mixes, which the solver accounts for.

## Common Development Patterns

### Adding a New Color Feature
1. Sample/calculate color in sRGB hex format
2. Use spectral adapter functions for mixing/comparison
3. Handle async loading of spectral.js (check `isSpectralAvailable()`)
4. Cache results where possible to avoid redundant calculations

### Modifying the Palette
Edit `lib/spectral/palette.ts`:
- Update `PALETTE` array with new pigments
- Ensure hex values are accurate (ideally from measured spectral data)
- Set appropriate tinting strengths (1.0 for most, 2.0+ for strong pigments)
- Palette changes require testing both solvers

### Canvas Operations
When modifying ImageCanvas:
- Use transform matrix for all zoom/pan (don't modify image data)
- Sample colors from original image data, not scaled canvas
- Handle ResizeObserver for responsive behavior
- Update cursor state for UX feedback (crosshair, grab, grabbing)
