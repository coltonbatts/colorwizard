# ColorWizard Review Packet

## Snapshot

- Project type: Next.js 15 App Router application with a heavily client-side runtime
- Primary user experience: upload image -> sample pixel -> get paint recipe, color name, DMC floss matches, and saved local artifacts
- Current product shape: a "thin core" is active, while a large amount of older or experimental UI remains in the repo
- Build status:
  - `npm run build`: passes
  - `npx tsc --noEmit`: fails because `tsconfig.json` includes `.next/types/**/*.ts` even when those generated files are absent
  - `npm test -- --run`: fails to start due to a Vitest/Vite ESM loading error
- Notable repo characteristic: code surface is much smaller than repo surface; the repo contains substantial docs, agent/editor configs, quarantined pages, and orphaned components

## Project Overview

ColorWizard is a local-first color analysis tool for painters and related physical-media workflows. The active app is centered around a single canvas loop:

1. Load a reference image.
2. Render and normalize it into a browser-safe working buffer.
3. Sample a pixel on click/tap.
4. Derive painter-facing outputs:
   - color values
   - perceptual name
   - oil paint recipe
   - DMC embroidery floss matches
   - saved pins/session colors/color cards

The codebase also contains billing, auth, paint catalog work, measurement/calibration tools, deck management, Procreate export, and a significant amount of quarantined or currently unused UI.

## Architecture Summary

### High-Level Shape

- Runtime shell: Next.js App Router (`app/`)
- Rendering model: mostly client components, with the main product loop inside [`app/page.tsx`](./app/page.tsx)
- Core interaction surface: [`components/ImageCanvas.tsx`](./components/ImageCanvas.tsx)
- State management: multiple persisted Zustand slices under [`lib/store/`](./lib/store)
- Heavy computation offload:
  - image analysis worker: [`lib/workers/imageProcessor.worker.ts`](./lib/workers/imageProcessor.worker.ts)
  - paint recipe solver worker: [`lib/paint/solver.worker.ts`](./lib/paint/solver.worker.ts)
- Local data:
  - DMC dataset in [`lib/dmcFloss.ts`](./lib/dmcFloss.ts)
  - color name dataset lazily fetched from `public/colornames.json`
  - paint catalog in [`data/paints/winsor-newton/winton.json`](./data/paints/winsor-newton/winton.json)
- Optional remote integrations:
  - Firebase Auth / Firestore
  - Stripe checkout + webhook
  - Resend or SendGrid for email

### Active Product Core

The active thin core is concentrated in these areas:

- [`app/page.tsx`](./app/page.tsx)
- [`components/ImageCanvas.tsx`](./components/ImageCanvas.tsx)
- [`components/tabs/SampleTab.tsx`](./components/tabs/SampleTab.tsx)
- [`components/tabs/MatchesTab.tsx`](./components/tabs/MatchesTab.tsx)
- [`components/PaintRecipe.tsx`](./components/PaintRecipe.tsx)
- [`hooks/useImageAnalyzer.ts`](./hooks/useImageAnalyzer.ts)
- [`lib/paint/solveRecipe.ts`](./lib/paint/solveRecipe.ts)
- [`lib/dmcFloss.ts`](./lib/dmcFloss.ts)
- [`lib/colorNaming/index.ts`](./lib/colorNaming/index.ts)

### Thin Core vs Repo Baggage

The repo clearly preserves a larger earlier product surface:

- quarantined routes still exist and build as placeholder pages:
  - `/dashboard`
  - `/pricing`
  - `/settings`
  - `/support`
  - `/color-theory`
  - `/trace`
- many related components, tabs, camera/AR tools, color-theory views, and advanced palette tools remain in source but are not part of the active runtime path
- the repo also includes a large volume of historical internal docs and multi-agent/editor metadata

## Major Subsystems

### 1. App Shell and Routing

- [`app/layout.tsx`](./app/layout.tsx): root metadata, auth provider, storage migration bootstrap
- [`app/page.tsx`](./app/page.tsx): main orchestration for the active tool
- API routes under [`app/api/`](./app/api)

### 2. Canvas and Image Pipeline

- [`components/ImageCanvas.tsx`](./components/ImageCanvas.tsx): canvas rendering, sampling, overlay orchestration, file handling, mobile stabilization
- [`components/canvas/ImageDropzone.tsx`](./components/canvas/ImageDropzone.tsx): upload / drag-and-drop / HEIC conversion
- [`lib/imagePipeline.ts`](./lib/imagePipeline.ts): image normalization into capped-resolution source buffers
- [`lib/canvasRendering.ts`](./lib/canvasRendering.ts): fit calculations

### 3. State and Persistence

- Zustand slices:
  - [`lib/store/useCanvasStore.ts`](./lib/store/useCanvasStore.ts)
  - [`lib/store/useSessionStore.ts`](./lib/store/useSessionStore.ts)
  - [`lib/store/useCalibrationStore.ts`](./lib/store/useCalibrationStore.ts)
  - [`lib/store/useLayoutStore.ts`](./lib/store/useLayoutStore.ts)
  - [`lib/store/usePaletteStore.ts`](./lib/store/usePaletteStore.ts)
  - [`lib/store/usePaintPaletteStore.ts`](./lib/store/usePaintPaletteStore.ts)
- localStorage helpers:
  - [`lib/store/storage.ts`](./lib/store/storage.ts)
  - [`lib/store/migrateLegacyStore.ts`](./lib/store/migrateLegacyStore.ts)
- non-Zustand local storage:
  - [`components/SessionPaletteStrip.tsx`](./components/SessionPaletteStrip.tsx)
  - [`lib/colorCardStorage.ts`](./lib/colorCardStorage.ts)

### 4. Color Analysis and Matching

- color conversions and luminance math:
  - [`lib/color/conversions.ts`](./lib/color/conversions.ts)
  - [`lib/colorUtils.ts`](./lib/colorUtils.ts)
  - [`lib/valueScale.ts`](./lib/valueScale.ts)
  - [`lib/valueMode.ts`](./lib/valueMode.ts)
  - [`lib/paintingMath.ts`](./lib/paintingMath.ts)
- color naming:
  - [`lib/colorNaming/index.ts`](./lib/colorNaming/index.ts)
  - [`lib/colorNaming/match.ts`](./lib/colorNaming/match.ts)
  - [`lib/colorNaming/datasets/extended.ts`](./lib/colorNaming/datasets/extended.ts)
- DMC matching:
  - [`lib/dmcFloss.ts`](./lib/dmcFloss.ts)

### 5. Paint Mixing and Recipe Solving

- UI entry:
  - [`components/PaintRecipe.tsx`](./components/PaintRecipe.tsx)
- solver:
  - [`lib/paint/solveRecipe.ts`](./lib/paint/solveRecipe.ts)
  - [`lib/paint/solver.worker.ts`](./lib/paint/solver.worker.ts)
  - [`lib/spectral/adapter.ts`](./lib/spectral/adapter.ts)
  - [`lib/spectral/palette.ts`](./lib/spectral/palette.ts)
  - [`lib/paint/catalog.ts`](./lib/paint/catalog.ts)

### 6. Saved Artifacts / Deck

- [`components/ColorDeckPanel.tsx`](./components/ColorDeckPanel.tsx)
- [`components/ColorCardModal.tsx`](./components/ColorCardModal.tsx)
- [`lib/colorArtifacts.ts`](./lib/colorArtifacts.ts)
- [`lib/colorCardStorage.ts`](./lib/colorCardStorage.ts)

### 7. Auth, Billing, and User Tier

- auth:
  - [`lib/auth/useAuth.tsx`](./lib/auth/useAuth.tsx)
  - [`lib/auth/server.ts`](./lib/auth/server.ts)
  - [`lib/firebase.ts`](./lib/firebase.ts)
- billing / tier:
  - [`app/api/user/tier/route.ts`](./app/api/user/tier/route.ts)
  - [`app/api/stripe/create-checkout/route.ts`](./app/api/stripe/create-checkout/route.ts)
  - [`app/api/stripe/webhook/route.ts`](./app/api/stripe/webhook/route.ts)
  - [`lib/db/userTier.ts`](./lib/db/userTier.ts)
  - [`lib/featureFlags.ts`](./lib/featureFlags.ts)
  - [`lib/hooks/useUserTier.ts`](./lib/hooks/useUserTier.ts)
  - [`lib/hooks/useFeatureAccess.ts`](./lib/hooks/useFeatureAccess.ts)

## Important File Tree

```text
app/
  layout.tsx
  page.tsx
  globals.css
  error.tsx
  api/
    ai/suggestions/route.ts
    health/route.ts
    stripe/
      create-checkout/route.ts
      webhook/route.ts
    user/tier/route.ts
  color-theory/page.tsx        # quarantined placeholder
  dashboard/page.tsx           # quarantined placeholder
  pricing/page.tsx             # quarantined placeholder
  settings/page.tsx            # quarantined placeholder
  support/page.tsx             # quarantined placeholder
  trace/page.tsx               # quarantined placeholder

components/
  ImageCanvas.tsx
  CompactToolbar.tsx
  CollapsibleSidebar.tsx
  MobileDashboard.tsx
  MobileNavigation.tsx
  SessionPaletteStrip.tsx
  PaletteManager.tsx
  CalibrationModal.tsx
  CanvasSettingsModal.tsx
  PaintRecipe.tsx
  DMCFlossMatch.tsx
  ColorNamingDisplay.tsx
  ColorDeckPanel.tsx
  ColorCardModal.tsx
  StoreBootstrap.tsx
  tabs/
    SampleTab.tsx
    MatchesTab.tsx
  canvas/
    ImageDropzone.tsx
    GridControlsPanel.tsx
    NavigatorMinimap.tsx
    ZoomControlsBar.tsx
  errors/
    CanvasErrorFallback.tsx
    SidebarErrorFallback.tsx

hooks/
  useImageAnalyzer.ts
  useMediaQuery.ts
  useDebounce.ts

lib/
  auth/
    server.ts
    useAuth.tsx
  db/
    userTier.ts
  color/
    a11y.ts
    conversions.ts
  colorNaming/
    index.ts
    cache.ts
    match.ts
    datasets/
      css.ts
      extended.ts
      xkcd.ts
  paint/
    catalog.ts
    solveRecipe.ts
    solver.worker.ts
    types/Paint.ts
  spectral/
    adapter.ts
    palette.ts
    types.ts
  store/
    storage.ts
    migrateLegacyStore.ts
    useCanvasStore.ts
    useSessionStore.ts
    useCalibrationStore.ts
    useLayoutStore.ts
    usePaletteStore.ts
    usePaintPaletteStore.ts
  workers/
    index.ts
    imageProcessor.worker.ts
  imagePipeline.ts
  canvasRendering.ts
  calibration.ts
  valueScale.ts
  valueMode.ts
  paintingMath.ts
  dmcFloss.ts
  colorArtifacts.ts
  colorCardStorage.ts
  featureFlags.ts
  firebase.ts
  stripe-config.ts
  env-validator.ts
  email/
    service.ts
    templates.ts

data/
  paints/
    winsor-newton/winton.json

public/
  colornames.json
```

## Runtime / Framework / State / Styling / Data / Auth / Deployment

| Area | Primary Choice | Notes |
|---|---|---|
| Runtime | Next.js 15 App Router | Mostly client-rendered product shell |
| UI framework | React 18 | Heavy use of client components |
| State management | Zustand | Multiple persisted slices instead of one normalized app store |
| Styling | Tailwind CSS + very large `app/globals.css` token layer | Tailwind utility classes coexist with a large custom CSS system |
| Data layer | Local in-browser state + static datasets + optional Firestore | Most product logic is local-first |
| Auth | Firebase Auth client SDK | Server auth verification is not implemented |
| Storage | localStorage, public JSON assets, Firestore for tier, Stripe for billing metadata | Persistence is split across Zustand and ad hoc modules |
| Worker/off-main-thread compute | Comlink workers | Image analysis and recipe solving |
| Deployment target | Vercel-style Next deployment | Supported by GitHub Actions CI and Next build output |

## Key Dependencies

### Core / Legitimately Used

- `next`, `react`, `react-dom`
- `zustand`
- `culori`
- `comlink`
- `spectral.js`
- `firebase`
- `stripe`
- `framer-motion`
- `heic2any`
- `html-to-image`
- `jszip`
- `tailwindcss`, `postcss`, `autoprefixer`
- `typescript`
- `vitest`

### Likely Unused or Effectively Dormant

- `@stripe/stripe-js`
  - No imports found. Checkout uses server-created `session.url` and `window.location.href` instead.
- `jsqr`
  - No imports found.
- `react-webcam`
  - No imports found in the active or reachable graph.

### Dependencies Tied Mostly to Quarantined or Orphaned Surfaces

- parts of `framer-motion` usage live in old/quarantined components
- `firebase` / `stripe` are present in the active server surface, but the product flow around them is only partially wired

### Pattern / Drift Concerns

- Next build warns about an `@next/swc` version mismatch (`15.5.7` vs `15.5.11`)
- repo docs still reference older subscription-era pricing and deployment patterns while runtime config is lifetime-purchase oriented

## Likely Risks

### High-Risk Product / Security / Correctness

- Server auth is not real.
  - [`lib/auth/server.ts`](./lib/auth/server.ts) returns `'demo-user'` when no `Authorization` header exists, and otherwise treats the raw bearer token as the user id.
- Client upgrade flow does not send auth.
  - [`lib/hooks/useFeatureAccess.ts`](./lib/hooks/useFeatureAccess.ts) posts to `/api/stripe/create-checkout` without an auth header.
  - Result: anonymous or unauthenticated checkout sessions can be associated to the shared `'demo-user'`.
- Paid redirects point to quarantined placeholder pages.
  - `success_url` goes to `/dashboard`.
  - `cancel_url` goes to `/pricing`.
  - Both routes are currently stub placeholders.
- AI suggestion gating is not authoritative.
  - [`app/api/ai/suggestions/route.ts`](./app/api/ai/suggestions/route.ts) trusts a client-supplied `tier` field.

### Medium-Risk Maintainability / Reviewability

- The active thin core is buried inside a much larger inactive source surface.
- Major orchestration files are large and multi-purpose:
  - [`app/page.tsx`](./app/page.tsx)
  - [`components/ImageCanvas.tsx`](./components/ImageCanvas.tsx)
  - [`components/ColorDeckPanel.tsx`](./components/ColorDeckPanel.tsx)
  - [`app/globals.css`](./app/globals.css)
- Persistence patterns are inconsistent:
  - Zustand slices
  - direct `localStorage`
  - global window hook (`__sessionPaletteAdd`)
  - Firestore tier docs

### Tooling / Quality Risks

- standalone typecheck currently fails unless `.next/types` exists
- tests do not currently boot
- build passes, but lint/type warnings are concentrated in dormant files, which obscures the health of the active core

## Open Questions

1. Is the thin-core direction permanent, or are the quarantined routes/tools expected to return?
2. Is anonymous usage expected to coexist with paid upgrades? If yes, what is the intended identity model?
3. Is the canonical monetization model lifetime-only or a leftover mix of lifetime and subscription plans?
4. Should Firestore remain the source of truth for user tier if server-side token verification is not implemented?
5. Should the paint-catalog flow replace the legacy palette flow, or do both need to remain first-class?
6. Is the deck / Procreate export surface part of thin core, or should it be split into a later package/surface?

## Top 20 Files Another Model Should Read First

1. [`docs/PRD.md`](./docs/PRD.md)
2. [`package.json`](./package.json)
3. [`app/page.tsx`](./app/page.tsx)
4. [`components/ImageCanvas.tsx`](./components/ImageCanvas.tsx)
5. [`components/CompactToolbar.tsx`](./components/CompactToolbar.tsx)
6. [`components/tabs/SampleTab.tsx`](./components/tabs/SampleTab.tsx)
7. [`components/tabs/MatchesTab.tsx`](./components/tabs/MatchesTab.tsx)
8. [`components/PaintRecipe.tsx`](./components/PaintRecipe.tsx)
9. [`hooks/useImageAnalyzer.ts`](./hooks/useImageAnalyzer.ts)
10. [`lib/imagePipeline.ts`](./lib/imagePipeline.ts)
11. [`lib/workers/index.ts`](./lib/workers/index.ts)
12. [`lib/workers/imageProcessor.worker.ts`](./lib/workers/imageProcessor.worker.ts)
13. [`lib/store/useCanvasStore.ts`](./lib/store/useCanvasStore.ts)
14. [`lib/store/useSessionStore.ts`](./lib/store/useSessionStore.ts)
15. [`lib/store/useCalibrationStore.ts`](./lib/store/useCalibrationStore.ts)
16. [`lib/colorNaming/index.ts`](./lib/colorNaming/index.ts)
17. [`lib/dmcFloss.ts`](./lib/dmcFloss.ts)
18. [`lib/paint/solveRecipe.ts`](./lib/paint/solveRecipe.ts)
19. [`lib/auth/server.ts`](./lib/auth/server.ts)
20. [`app/api/user/tier/route.ts`](./app/api/user/tier/route.ts)

## Recommended Review Stance

Treat this repository as:

- an active thin-core image-analysis tool
- plus a large retained layer of dormant product experiments and incomplete platform work

Do not assume every source file is part of the live product path. Separate:

- active core
- reachable but secondary support code
- quarantined routes
- orphaned / likely dead surfaces
- historical docs and non-code noise
