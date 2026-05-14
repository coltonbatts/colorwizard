# Pack ColorWizard For A Large-Context LLM

## Goal

Send the next model the smallest file set that still explains:

- what the product is
- how the active runtime works
- where state lives
- how image sampling and recipe solving work
- where billing/auth/tier logic is risky

Do not send the whole repo by default. The repo contains substantial noise.

## Include These Files

### Context and Config

- `docs/PRD.md`
- `package.json`
- `tsconfig.json`
- `next.config.js`
- `tailwind.config.ts`
- `vitest.config.ts`
- `.env.local.example`
- `.github/workflows/ci.yml`

### App Shell and Routes

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/error.tsx`
- `app/api/health/route.ts`
- `app/api/user/tier/route.ts`
- `app/api/stripe/create-checkout/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/ai/suggestions/route.ts`

### Active UI Surface

- `components/StoreBootstrap.tsx`
- `components/ImageCanvas.tsx`
- `components/CompactToolbar.tsx`
- `components/CollapsibleSidebar.tsx`
- `components/MobileDashboard.tsx`
- `components/MobileNavigation.tsx`
- `components/SessionPaletteStrip.tsx`
- `components/PaletteManager.tsx`
- `components/CalibrationModal.tsx`
- `components/CanvasSettingsModal.tsx`
- `components/ColorDeckPanel.tsx`
- `components/ColorCardModal.tsx`
- `components/PaintRecipe.tsx`
- `components/DMCFlossMatch.tsx`
- `components/ColorNamingDisplay.tsx`
- `components/tabs/SampleTab.tsx`
- `components/tabs/MatchesTab.tsx`
- `components/canvas/ImageDropzone.tsx`
- `components/errors/CanvasErrorFallback.tsx`
- `components/errors/SidebarErrorFallback.tsx`

### Hooks

- `hooks/useImageAnalyzer.ts`
- `hooks/useMediaQuery.ts`
- `hooks/useDebounce.ts`

### Auth, Tier, and Integrations

- `lib/auth/server.ts`
- `lib/auth/useAuth.tsx`
- `lib/firebase.ts`
- `lib/db/userTier.ts`
- `lib/env-validator.ts`
- `lib/featureFlags.ts`
- `lib/hooks/useUserTier.ts`
- `lib/hooks/useFeatureAccess.ts`
- `lib/stripe-config.ts`
- `lib/email/service.ts`
- `lib/email/templates.ts`

### State and Persistence

- `lib/store/storage.ts`
- `lib/store/migrateLegacyStore.ts`
- `lib/store/useCanvasStore.ts`
- `lib/store/useSessionStore.ts`
- `lib/store/useCalibrationStore.ts`
- `lib/store/useLayoutStore.ts`
- `lib/store/usePaletteStore.ts`
- `lib/store/usePaintPaletteStore.ts`
- `lib/colorArtifacts.ts`
- `lib/colorCardStorage.ts`
- `lib/cardMeta.ts`

### Core Image / Color / Recipe Logic

- `lib/imagePipeline.ts`
- `lib/canvasRendering.ts`
- `lib/calibration.ts`
- `lib/color/conversions.ts`
- `lib/color/a11y.ts`
- `lib/colorUtils.ts`
- `lib/valueScale.ts`
- `lib/valueMode.ts`
- `lib/paintingMath.ts`
- `lib/colorNaming/index.ts`
- `lib/colorNaming/cache.ts`
- `lib/colorNaming/match.ts`
- `lib/colorNaming/datasets/extended.ts`
- `lib/dmcFloss.ts`
- `lib/paint/catalog.ts`
- `lib/paint/solveRecipe.ts`
- `lib/paint/solver.worker.ts`
- `lib/paint/types/Paint.ts`
- `lib/spectral/adapter.ts`
- `lib/spectral/palette.ts`
- `lib/spectral/types.ts`
- `lib/procreateExport.ts`
- `lib/workers/index.ts`
- `lib/workers/imageProcessor.worker.ts`

### Key Types

- `lib/types/canvas.ts`
- `lib/types/colorCard.ts`
- `lib/types/measurement.ts`
- `lib/types/palette.ts`
- `lib/types/pinnedColor.ts`
- `lib/types/procreate.ts`
- `lib/types/valueScale.ts`

### Data Needed For Structure Review

- `data/paints/winsor-newton/winton.json`

## Optional Files

Only include these if the next model has room and you want it to assess dormant surfaces too:

- `app/dashboard/dashboard-content.tsx`
- `components/AISuggestions.tsx`
- `components/FeatureGate.tsx`
- `components/UploadHero.tsx`
- `components/ReferenceImageUploader.tsx`
- `components/tabs/ReferenceTab.tsx`
- `components/tabs/StructureTab.tsx`
- `components/tabs/SurfaceTab.tsx`
- `components/tabs/PaintLibraryTab.tsx`
- `components/ARCanvas.tsx`
- `components/CameraView.tsx`
- `components/color-theory/**/*`
- `components/drawing/**/*`
- `lib/perspectiveWarp.ts`
- `lib/breakdownStorage.ts`

Also optional:

- `public/colornames.json`

Reason:

- it is large
- the naming algorithm can be reviewed without the full dataset blob
- include it only if you want dataset-quality or payload-size commentary

## Exclude These Files

### Always Exclude

- `node_modules/**`
- `.next/**`
- `tsconfig.tsbuildinfo`
- `package-lock.json`
- `public/favicon.png`

### Exclude Repo Noise

- `.agent/**`
- `.agents/**`
- `.claude/**`
- `.cline/**`
- `.codebuddy/**`
- `.codex/**`
- `.commandcode/**`
- `.continue/**`
- `.crush/**`
- `.cursor/**`
- `.factory/**`
- `.gemini/**`
- `.goose/**`
- `.junie/**`
- `.kilocode/**`
- `.kiro/**`
- `.kode/**`
- `.mcpjam/**`
- `.mux/**`
- `.neovate/**`
- `.opencode/**`
- `.openhands/**`
- `.pi/**`
- `.pochi/**`
- `.qoder/**`
- `.qwen/**`
- `.roo/**`
- `.trae/**`
- `.windsurf/**`
- `.zencoder/**`
- `skills/**`
- `plans/**`

### Exclude Historical / Marketing / Internal Docs

- `.github/internal-docs/**`
- `docs/marketing/**`
- `docs/*.docx`
- `docs/*.pdf`
- `README.md`
- `DEPLOYMENT.md`
- `ENV_SETUP_GUIDE.md`
- `CLI_TOOLS_SETUP.md`
- `mobile_stabilization_log.md`

You can keep `docs/PRD.md`. Everything else in docs is optional and usually noise for a code audit.

## Read Order For The Next Model

1. Read `docs/PRD.md` and `package.json` first.
2. Read the app shell: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.
3. Read the main canvas path:
   - `components/ImageCanvas.tsx`
   - `components/canvas/ImageDropzone.tsx`
   - `hooks/useImageAnalyzer.ts`
   - `lib/imagePipeline.ts`
   - `lib/workers/index.ts`
   - `lib/workers/imageProcessor.worker.ts`
4. Read the user-facing outputs:
   - `components/tabs/SampleTab.tsx`
   - `components/PaintRecipe.tsx`
   - `components/tabs/MatchesTab.tsx`
   - `components/DMCFlossMatch.tsx`
   - `components/ColorNamingDisplay.tsx`
5. Read state and persistence:
   - all `lib/store/*` files listed above
   - `components/SessionPaletteStrip.tsx`
   - `lib/colorArtifacts.ts`
   - `lib/colorCardStorage.ts`
   - `components/ColorDeckPanel.tsx`
6. Read domain logic:
   - `lib/valueScale.ts`
   - `lib/valueMode.ts`
   - `lib/paintingMath.ts`
   - `lib/colorNaming/*`
   - `lib/dmcFloss.ts`
   - `lib/paint/catalog.ts`
   - `lib/paint/solveRecipe.ts`
   - `lib/paint/solver.worker.ts`
   - `lib/spectral/*`
7. Read server/integration edges last:
   - `lib/auth/server.ts`
   - `lib/auth/useAuth.tsx`
   - `lib/firebase.ts`
   - `lib/db/userTier.ts`
   - `app/api/user/tier/route.ts`
   - `app/api/stripe/create-checkout/route.ts`
   - `app/api/stripe/webhook/route.ts`
   - `app/api/ai/suggestions/route.ts`

## Packing Strategy

### Best Default Packet

Send the exact "Include These Files" list above and nothing else.

### If You Need A Second Pass

After the first review, send the optional dormant-surface files only if the next model specifically wants to audit:

- dead code
- AR/camera experiments
- quarantined tabs
- product drift beyond thin core

## What The Next Model Should Be Told

Use this framing:

"Treat ColorWizard as a thin-core local-first canvas app surrounded by a large amount of retained, quarantined, or likely dead code. Review the active runtime first, then assess the server auth/billing surface, then comment on dormant or orphaned code as technical debt rather than as primary product architecture."
