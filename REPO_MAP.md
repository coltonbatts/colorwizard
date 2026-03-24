# ColorWizard Repo Map

## One-Sentence Map

ColorWizard is a browser-first image sampling tool built on Next.js, where most real work happens client-side in a single page and flows through canvas rendering, worker-based analysis, persisted Zustand state, and static/local datasets.

## What Is Actually Active

### Active Thin Core

- [`app/page.tsx`](./app/page.tsx): the main app
- image upload, normalization, and canvas sampling
- sample results:
  - paint recipe
  - DMC matches
  - color naming
  - session strip
  - color deck
- optional measurement/grid/calibration tools embedded into the same page

### Present but Not Core to the Live Flow

- Firebase auth and Firestore user tier plumbing
- Stripe checkout + webhook
- email notification utilities
- paint catalog / custom paint palette support
- color deck export / Procreate export

### Present but Quarantined or Likely Dormant

- placeholder routes for dashboard, pricing, settings, support, trace, and color-theory
- AR/camera tools
- larger color-theory lab UI
- many palette, drawing, and advanced-tab components

## Top-Level Repo Structure

### Product Runtime

- [`app/`](./app): Next.js routes and API handlers
- [`components/`](./components): UI and canvas logic
- [`hooks/`](./hooks): React hooks
- [`lib/`](./lib): domain logic, stores, integrations, workers
- [`data/`](./data): paint catalog JSON
- [`public/`](./public): static client-fetched assets

### Support / Noise / Historical Material

- [`docs/`](./docs): extensive docs, but mostly not required for code review
- [`.github/internal-docs/`](./.github/internal-docs): historical delivery and planning docs
- many AI/editor config folders at repo root
- generated artifacts such as `.next/` and `tsconfig.tsbuildinfo`

## Data Flow

## 1. Boot Flow

```text
app/layout.tsx
  -> StoreBootstrap
    -> migrateLegacyStore()
  -> AuthProvider
    -> Firebase auth listener
  -> app/page.tsx
```

Key files:

- [`app/layout.tsx`](./app/layout.tsx)
- [`components/StoreBootstrap.tsx`](./components/StoreBootstrap.tsx)
- [`lib/store/migrateLegacyStore.ts`](./lib/store/migrateLegacyStore.ts)
- [`lib/auth/useAuth.tsx`](./lib/auth/useAuth.tsx)

## 2. Image Upload and Normalization Flow

```text
User selects or drops image
  -> components/canvas/ImageDropzone.tsx
  -> HTMLImageElement created
  -> app/page.tsx handleImageLoad()
  -> useCanvasStore.setImage()
  -> components/ImageCanvas.tsx
  -> lib/imagePipeline.createSourceBuffer()
  -> normalized canvas buffer becomes source of truth for sampling/rendering
```

Key files:

- [`components/canvas/ImageDropzone.tsx`](./components/canvas/ImageDropzone.tsx)
- [`app/page.tsx`](./app/page.tsx)
- [`lib/store/useCanvasStore.ts`](./lib/store/useCanvasStore.ts)
- [`components/ImageCanvas.tsx`](./components/ImageCanvas.tsx)
- [`lib/imagePipeline.ts`](./lib/imagePipeline.ts)

## 3. Image Analysis Flow

```text
ImageCanvas source buffer
  -> hooks/useImageAnalyzer.ts
  -> Comlink worker bridge
  -> lib/workers/imageProcessor.worker.ts
  -> Lab buffer + luminance buffer + histogram
  -> value scale state written back into store / component state
```

Purpose:

- keep heavy pixel processing off the main thread
- support highlight overlays and value-mode analysis

Key files:

- [`hooks/useImageAnalyzer.ts`](./hooks/useImageAnalyzer.ts)
- [`lib/workers/index.ts`](./lib/workers/index.ts)
- [`lib/workers/imageProcessor.worker.ts`](./lib/workers/imageProcessor.worker.ts)
- [`lib/valueScale.ts`](./lib/valueScale.ts)

## 4. Sampling Flow

```text
User clicks/taps canvas
  -> ImageCanvas samples pixel
  -> sampledColor written to useSessionStore
  -> active tab UI re-renders
  -> Sample tab shows recipe + name + pin/deck actions
  -> Matches tab shows DMC results
```

Key files:

- [`components/ImageCanvas.tsx`](./components/ImageCanvas.tsx)
- [`lib/store/useSessionStore.ts`](./lib/store/useSessionStore.ts)
- [`components/tabs/SampleTab.tsx`](./components/tabs/SampleTab.tsx)
- [`components/tabs/MatchesTab.tsx`](./components/tabs/MatchesTab.tsx)

## 5. Paint Recipe Flow

```text
Sampled color
  -> components/PaintRecipe.tsx
  -> worker solveRecipe(targetHex, options)
  -> lib/paint/solveRecipe.ts
  -> lib/spectral/adapter.ts
  -> optional paint catalog filter from usePaintPaletteStore / activePalette
  -> recipe ingredients + match quality + steps
```

There are two recipe paths:

- primary: spectral worker-based solver
- fallback: heuristic recipe generation via [`lib/colorMixer.ts`](./lib/colorMixer.ts)

Key files:

- [`components/PaintRecipe.tsx`](./components/PaintRecipe.tsx)
- [`lib/paint/solveRecipe.ts`](./lib/paint/solveRecipe.ts)
- [`lib/paint/solver.worker.ts`](./lib/paint/solver.worker.ts)
- [`lib/spectral/adapter.ts`](./lib/spectral/adapter.ts)
- [`lib/paint/catalog.ts`](./lib/paint/catalog.ts)
- [`lib/store/usePaintPaletteStore.ts`](./lib/store/usePaintPaletteStore.ts)

## 6. Color Naming Flow

```text
Sampled hex
  -> lib/colorNaming/index.ts
  -> cached result if available
  -> otherwise fetch /colornames.json once
  -> nearest-name match computed
  -> UI shows label + confidence
```

Key files:

- [`lib/colorNaming/index.ts`](./lib/colorNaming/index.ts)
- [`lib/colorNaming/datasets/extended.ts`](./lib/colorNaming/datasets/extended.ts)
- [`lib/colorNaming/match.ts`](./lib/colorNaming/match.ts)
- [`components/ColorNamingDisplay.tsx`](./components/ColorNamingDisplay.tsx)

## 7. DMC Matching Flow

```text
Sampled RGB
  -> lib/dmcFloss.ts
  -> full in-repo DMC dataset searched
  -> top matches returned
  -> Matches tab renders ranked list
```

Key files:

- [`lib/dmcFloss.ts`](./lib/dmcFloss.ts)
- [`components/DMCFlossMatch.tsx`](./components/DMCFlossMatch.tsx)

## 8. Local Artifact and Deck Flow

```text
Sampled color
  -> lib/colorArtifacts.ts
  -> optional spectral solve + DMC + naming snapshot
  -> persisted via lib/colorCardStorage.ts
  -> viewed in ColorDeckPanel / ColorCardModal
```

There are two local-save surfaces:

- session palette strip in [`components/SessionPaletteStrip.tsx`](./components/SessionPaletteStrip.tsx)
- full saved color deck in [`lib/colorCardStorage.ts`](./lib/colorCardStorage.ts)

Key files:

- [`lib/colorArtifacts.ts`](./lib/colorArtifacts.ts)
- [`lib/colorCardStorage.ts`](./lib/colorCardStorage.ts)
- [`components/ColorDeckPanel.tsx`](./components/ColorDeckPanel.tsx)
- [`components/ColorCardModal.tsx`](./components/ColorCardModal.tsx)

## 9. Auth, Tier, and Billing Flow

```text
Client auth state
  -> lib/auth/useAuth.tsx
  -> optional Firebase user token
  -> /api/user/tier
  -> lib/auth/server.ts
  -> lib/db/userTier.ts

Upgrade CTA
  -> lib/hooks/useFeatureAccess.ts
  -> /api/stripe/create-checkout
  -> Stripe hosted checkout
  -> /api/stripe/webhook
  -> lib/db/userTier.unlockProLifetime()
```

Important caveat:

- server-side auth is incomplete
- current API identity model is not trustworthy
- redirect targets point to quarantined pages

Key files:

- [`lib/auth/server.ts`](./lib/auth/server.ts)
- [`lib/auth/useAuth.tsx`](./lib/auth/useAuth.tsx)
- [`lib/firebase.ts`](./lib/firebase.ts)
- [`app/api/user/tier/route.ts`](./app/api/user/tier/route.ts)
- [`app/api/stripe/create-checkout/route.ts`](./app/api/stripe/create-checkout/route.ts)
- [`app/api/stripe/webhook/route.ts`](./app/api/stripe/webhook/route.ts)
- [`lib/db/userTier.ts`](./lib/db/userTier.ts)

## State Map

### Zustand Stores

- [`lib/store/useCanvasStore.ts`](./lib/store/useCanvasStore.ts)
  - image reference
  - reference overlay state
  - value-scale settings/results
  - canvas settings
- [`lib/store/useSessionStore.ts`](./lib/store/useSessionStore.ts)
  - sampled color
  - pinned colors
  - highlight mode/tolerance
  - value mode
- [`lib/store/useCalibrationStore.ts`](./lib/store/useCalibrationStore.ts)
  - calibration data
  - measure mode
  - grid state
- [`lib/store/useLayoutStore.ts`](./lib/store/useLayoutStore.ts)
  - sidebar state
  - compact/simple mode
- [`lib/store/usePaletteStore.ts`](./lib/store/usePaletteStore.ts)
  - legacy palette selections
- [`lib/store/usePaintPaletteStore.ts`](./lib/store/usePaintPaletteStore.ts)
  - paint-catalog palette selections

### Non-Store Persistence

- session palette strip uses direct localStorage plus `window.__sessionPaletteAdd`
- color deck uses direct localStorage serialization and migration

## Structural Conclusions

### The Real Core

The real system is not broad. It is a relatively compact canvas-analysis product surrounded by retained feature work.

### The Main Architectural Tension

The repo has two competing structures:

- a thin-core product that wants a narrow, legible runtime
- a retained monorepo-like product history with many dormant surfaces

That tension is the main reason this codebase is harder to review than it needs to be.

### Best Mental Model for Review

Review the code in this order:

1. active thin core
2. local persistence and saved artifacts
3. worker and recipe infrastructure
4. auth / tier / billing server edges
5. quarantined and orphaned surfaces as debt, not as primary runtime
