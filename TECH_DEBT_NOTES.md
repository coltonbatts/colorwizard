# ColorWizard Tech Debt Notes

## Bugs or Suspicious Code Paths

### 1. Server auth is effectively placeholder logic

- [`lib/auth/server.ts`](./lib/auth/server.ts) returns `'demo-user'` when no bearer token exists.
- If a bearer token does exist, it is treated as the user id without verification.
- This makes any tier, billing, or per-user server behavior untrustworthy.

### 2. Upgrade flow is likely broken end-to-end

- [`lib/hooks/useFeatureAccess.ts`](./lib/hooks/useFeatureAccess.ts) posts to `/api/stripe/create-checkout` without an auth header.
- [`app/api/stripe/create-checkout/route.ts`](./app/api/stripe/create-checkout/route.ts) relies on `getUserIdFromRequest()`.
- Result: checkout can attach to `'demo-user'`.
- Success and cancel redirects target quarantined pages:
  - `/dashboard`
  - `/pricing`
- Those routes are placeholders, so the user lands in a dead-end flow after payment or cancel.

### 3. Tier endpoint hides failures

- [`app/api/user/tier/route.ts`](./app/api/user/tier/route.ts) returns HTTP 200 with fallback free-tier payloads on many error cases.
- This prevents the UI from breaking, but it also masks real auth / Firestore failures.

### 4. AI suggestions route trusts client-supplied authorization state

- [`app/api/ai/suggestions/route.ts`](./app/api/ai/suggestions/route.ts) uses `tier` from the request body to decide whether the caller is Pro.
- This is not secure and should be treated as demo logic only.

### 5. Typecheck is not independently runnable

- [`tsconfig.json`](./tsconfig.json) includes `.next/types/**/*.ts`.
- Running `npx tsc --noEmit` before a fresh Next build fails if those generated files are missing or stale.

### 6. Tests do not boot

- `npm test -- --run` fails before executing tests because Vitest cannot load its config cleanly in the current Vite/Vitest/module state.
- This means tests are present but not presently trustworthy as a routine quality gate.

### 7. Webhook env validation is incomplete

- [`lib/env-validator.ts`](./lib/env-validator.ts) checks `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID`, but not `STRIPE_WEBHOOK_SECRET`.
- [`app/api/stripe/webhook/route.ts`](./app/api/stripe/webhook/route.ts) still expects webhook signature verification to work.

## Inconsistent Patterns

### 1. Multiple persistence models coexist

- Zustand-persisted slices in [`lib/store/`](./lib/store)
- direct localStorage in [`components/SessionPaletteStrip.tsx`](./components/SessionPaletteStrip.tsx)
- direct localStorage deck records in [`lib/colorCardStorage.ts`](./lib/colorCardStorage.ts)
- Firestore for user tier in [`lib/db/userTier.ts`](./lib/db/userTier.ts)

There is no single persistence strategy.

### 2. Old and new palette systems both exist

- legacy palette flow via [`lib/store/usePaletteStore.ts`](./lib/store/usePaletteStore.ts)
- catalog paint palette flow via [`lib/store/usePaintPaletteStore.ts`](./lib/store/usePaintPaletteStore.ts)

The product direction between them is not fully resolved.

### 3. Product messaging is inconsistent across code and docs

- README and Stripe runtime config point toward `$1` lifetime
- [`lib/featureFlags.ts`](./lib/featureFlags.ts) still describes a monthly/yearly Pro framing in comments
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) still discusses monthly/annual products

### 4. Thin core and legacy surface are mixed together

- active app is a narrow three-tab workflow
- repo still contains many advanced tabs, camera/AR tools, and color-theory tools in first-class source locations

### 5. Side effects happen in render-time code

- [`components/StoreBootstrap.tsx`](./components/StoreBootstrap.tsx) calls `migrateLegacyStore()` during render instead of from an effect boundary

### 6. Global window escape hatch

- [`components/SessionPaletteStrip.tsx`](./components/SessionPaletteStrip.tsx) exposes `window.__sessionPaletteAdd`
- This bypasses the main state architecture and makes behavior harder to trace

## Outdated UX or Frontend Patterns

### 1. Quarantined routes still ship as real app pages

- `/dashboard`
- `/pricing`
- `/settings`
- `/support`
- `/color-theory`
- `/trace`

They render placeholder pages but still contribute to the mental and route surface of the app.

### 2. A large amount of dead-or-dormant UI still lints and builds

- many warnings shown during build come from components that appear unreachable from the active runtime
- this makes the warning stream noisy and lowers confidence in the active surface

### 3. Some UI still relies on `dangerouslySetInnerHTML`

- [`components/PaintRecipe.tsx`](./components/PaintRecipe.tsx)
- [`components/AISuggestions.tsx`](./components/AISuggestions.tsx)

This is manageable, but it is another signal that some presentation logic is encoded as HTML strings rather than structured view state.

### 4. Direct DOM and browser API handling is spread across large components

- file handling
- clipboard
- downloads
- worker orchestration
- drag/drop
- pointer math

Much of this lives in [`components/ImageCanvas.tsx`](./components/ImageCanvas.tsx) and related large components rather than in tighter service boundaries.

## Likely Performance Issues

### 1. Main entry surface is large for a thin-core app

- build output reports `/` at about `150 kB` route size and `363 kB` first-load JS
- that is not catastrophic, but it is high for a supposedly narrow canvas workflow

### 2. Large monolithic client components

- [`components/ImageCanvas.tsx`](./components/ImageCanvas.tsx)
- [`app/page.tsx`](./app/page.tsx)
- [`components/ColorDeckPanel.tsx`](./components/ColorDeckPanel.tsx)
- [`app/globals.css`](./app/globals.css)

These files concentrate behavior, which increases re-render, regression, and review risk.

### 3. Datasets are embedded in code or fetched as large blobs

- full DMC dataset inside [`lib/dmcFloss.ts`](./lib/dmcFloss.ts)
- `public/colornames.json` is over 1 MB

That may be fine for product goals, but it should be acknowledged as a performance and review-context cost.

### 4. Console logging remains in the active runtime

- upload, image analysis, image pipeline, canvas, and page orchestration all log in normal paths
- this is useful for debugging but noisy in production behavior and review output

### 5. Worker boundary is good, but orchestration is still broad

- workers reduce main-thread cost
- however, worker invocation, UI coordination, fallback logic, and image lifecycle are still spread across large client components

## Maintainability Problems

### 1. Repo legibility is poor relative to actual active runtime

- active runtime is a minority of the repository
- docs, internal notes, AI/editor configs, and dormant code heavily outnumber the thin core

### 2. Reachable and unreachable code are not physically separated

- there is no strong folder boundary like `core/`, `experimental/`, or `quarantined/`
- the reader has to infer runtime importance from imports

### 3. Warning debt is high

`npm run build` passes, but reports many warnings in orphaned or dormant files:

- unused vars
- missing hook deps
- stale `img` usage warnings

This is not just cosmetic. It reduces signal when real warnings appear.

### 4. Domain logic is split across similar layers

- heuristic recipe generation in [`lib/colorMixer.ts`](./lib/colorMixer.ts)
- spectral recipe solving in [`lib/paint/solveRecipe.ts`](./lib/paint/solveRecipe.ts)
- catalog paint abstractions in [`lib/paint/catalog.ts`](./lib/paint/catalog.ts)

This is functional, but the ownership boundaries are not especially crisp.

### 5. Tooling drift

- `@next/swc` version mismatch during build
- Vitest startup failure
- standalone TypeScript check failure

These are strong signals that the repo has configuration drift even if the app still builds.

## Graph-Based Dead Weight Candidates

A lightweight import-graph pass found a large group of source files that appear unreachable from current route entrypoints. This list should be treated as "likely dead or quarantined", not a proof of deletion safety, but it is directionally useful.

Strong examples:

- [`components/AISuggestions.tsx`](./components/AISuggestions.tsx)
- [`components/ARCanvas.tsx`](./components/ARCanvas.tsx)
- [`components/CameraView.tsx`](./components/CameraView.tsx)
- [`components/ColorPanel.tsx`](./components/ColorPanel.tsx)
- [`components/ReferenceImageUploader.tsx`](./components/ReferenceImageUploader.tsx)
- [`components/tabs/AdvancedTab.tsx`](./components/tabs/AdvancedTab.tsx)
- [`components/tabs/ReferenceTab.tsx`](./components/tabs/ReferenceTab.tsx)
- [`components/tabs/StructureTab.tsx`](./components/tabs/StructureTab.tsx)
- [`components/tabs/SurfaceTab.tsx`](./components/tabs/SurfaceTab.tsx)
- [`components/color-theory/`](./components/color-theory)
- [`components/drawing/`](./components/drawing)
- [`lib/camera/useCamera.ts`](./lib/camera/useCamera.ts)
- [`lib/perspectiveWarp.ts`](./lib/perspectiveWarp.ts)
- [`lib/breakdownStorage.ts`](./lib/breakdownStorage.ts)
- [`data/paints/manifest.json`](./data/paints/manifest.json)

## Immediate Cleanup Candidates Before Any Major Rewrite

1. Make auth authoritative or clearly disable tiered/billing surfaces.
2. Decide whether dashboard/pricing/settings/support/trace/color-theory are real or should move out of the app tree.
3. Fix `tsc` and `vitest` so repo checks are independently runnable.
4. Resolve dependency drift and the `@next/swc` mismatch.
5. Physically separate active thin-core code from experimental or retained code.
