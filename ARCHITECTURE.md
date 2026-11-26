# ColorWizard Architecture

A first-hour guide to how ColorWizard is structured, where active development happens, and how to test changes safely. For detailed invariants, wording rules, and measurement history, see [`CLAUDE.md`](CLAUDE.md).

---

## 1. Product & Route Map

ColorWizard ships as both a **static web app** (Vercel, `output: 'export'` in production via `next.config.js`) and a **macOS desktop app** (Tauri v2 serving `out/` as `frontendDist`). There is no backend server, cloud sync, or required environment variables.

| Route | Entry file | Web behavior | Tauri desktop behavior |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | Renders `WebHome` → server-rendered `SimpleApp` (`out/index.html`) | Built with `COLORWIZARD_DESKTOP=1` → renders `HomeSwitch` → mounts `CoreWorkbench` |
| `/simple` | `app/simple/page.tsx` | Renders `SimpleApp` directly | Redirected back to `/` by `TauriAppShell` |
| `/thread` | `app/thread/page.tsx` | Renders `SimpleApp` opened on DMC Thread Studio | Redirected back to `/` by `TauriAppShell` |
| `/workbench` | `app/workbench/page.tsx` | Renders `CoreWorkbench` (full painter workbench) | Renders `CoreWorkbench` |

### How Web vs. Desktop Splits
- **Home split (`app/page.tsx`):** `COLORWIZARD_DESKTOP=1` (set by `scripts/build-desktop.mjs`, `scripts/tauri-dev.mjs`, and `npm run dev:tauri`) selects `components/HomeSwitch.tsx`, which defers rendering until mount and then opens `CoreWorkbench`. Standard web builds select `components/WebHome.tsx`, pre-rendering `SimpleApp` into static HTML while still falling back to `CoreWorkbench` if opened inside Tauri.
- **Layout split (`app/layout.tsx`):** `components/desktop/DesktopShellGate.tsx` keeps `TauriAppShell` (project gallery, license check, SQLite sync) out of the web first-load bundle. Web visitors receive `children` directly; desktop builds dynamically load `TauriAppShell` on boot.
- **Asset paths (`next.config.js`):** `COLORWIZARD_DESKTOP_BUILD=1` sets `assetPrefix: '.'` so Tauri's static export resolves assets relatively.

### Where to Build
- **Simple web app (`components/simple/`):** The **active feature surface**. Owns unified single-color analysis, spectral paint recipes, Whole-Picture Paint Plan + exports (printable cards, Procreate `.swatches`), Painting Process, Canvas Setup + painting packet, and DMC Thread Studio / Thread Map.
- **Desktop Workbench (`components/workbench/`, `components/desktop/`, `src-tauri/`):** The **shipped Tauri v1 workspace** (project gallery, local SQLite persistence, canvas overlays, MixLab). Keep it stable and backward-compatible; web-only Simple workflows are intentionally not wired into it.

---

## 2. UI & Hooks Layout

`components/simple/SimpleApp.tsx` stays thin by delegating state and async workflows to focused hooks under `components/simple/`, while heavy panels (`SimpleCanvas`, `ColorReadout`, `PlanPanel`, `ProcessPanel`, `ThreadStudio`, `ThreadView`) load via `next/dynamic`:

| Hook (`components/simple/`) | Responsibility |
| --- | --- |
| `useSimpleLibrary.ts` | Saved colors, collections, backup/restore, and strict-parse unreadable-storage guard |
| `useCanvasSetupState.ts` | Locked canvas aspect crop, landmarks, mix trials, span checks, and per-picture draft state |
| `useThreadStudioState.ts` | Thread Studio tabs, phone Thread view mode, and saving Thread Map pulls to the library |
| `usePlan.ts` | Off-thread paint planning with `inputKey` (`budget:pigments`) staleness tracking |
| `useProcess.ts` | Underpainting stage state (isolated so `ProcessPanel` stays lazy-loaded) |
| `useThreadMap.ts` | Off-thread Thread Map generation, thread swaps, locks, and undo/redo history |

Additional Simple helpers include `useTransferRecipes.ts` (solving mix-trial recipes against the active palette) and `readoutHooks.ts`.

Shared cross-app hooks live in the unified top-level `hooks/` directory (`useImageAnalyzer.ts`, `useSampleReadout.ts`, `useExportToProcreate.ts`, `useDesktopRuntime.ts`, `useUserTier.ts`, `useFeatureAccess.ts`, `useDebounce.ts`, `useElementSize.ts`, `useMediaQuery.ts`). `next.config.js` configures `eslint.dirs: ['app', 'components', 'hooks', 'lib']` so root hooks are linted alongside app and library code.

---

## 3. Core Domain Engines

Domain logic under `lib/` is pure TypeScript and React-free so it can run in Vitest and inside Web Workers.

### Three Separate Paint Systems (Do Not Conflate)
1. **Traditional qualitative mixer (`lib/colorMixer.ts`):** Instant HSL rule engine producing plain-language mixing cues for the Core 6 pigments.
2. **Per-color spectral solver (`lib/paint/solveRecipe.ts`):** Uses `spectral.js` (Kubelka-Munk-inspired reflectance mixing via `lib/spectral/adapter.ts` and `lib/spectral/palette.ts`) with coarse grid search + Nelder-Mead refinement (`lib/paint/nelderMead.ts`) and whole-part ratio reduction (`lib/paint/parts.ts`, ≤16 parts). The solver defaults to the Core 6; the web UI defaults to Core 6 + Burnt Sienna (`WEB_DEFAULT_PALETTE` in `lib/types/palette.ts`).
3. **Whole-picture paint planner (`lib/paint/plan/`):** Separate from `solveRecipe.ts`. Builds a cached library of measurable ≤16-part recipes (`library.ts`), picks 5 / 8 / 12 piles via deterministic k-medoids (`select.ts`, `plan.ts`), optionally derives secondary mixes (`derive.ts`), and maps every pixel (`picture.ts`). Exports share one pure model (`export.ts`) feeding Procreate `.swatches` (`procreatePalette.ts`) and printable cards (`card.ts`, `labels.ts`).

Supporting painting modules: `lib/paint/process/` (underpainting stages) and `lib/paint/canvasSetup.ts` (centered crop and inch-transfer geometry).

### DMC Embroidery Engine (`lib/dmc/`)
- **Data pipeline:** `scripts/generate-static-data.mjs` (run automatically via `predev`, `prebuild`, `pretest`, and `pretest:fast`) builds `public/data/dmc-floss.json` and `public/data/dmc-families.json` from `scripts/source/dmc-threads.json`, and copies `public/colornames.json` to `public/data/colornames.json`.
- **Thread Studio (`lib/dmc/catalog.ts`, `match.ts`, `studio.ts`, `threadFit.ts`):** CIEDE2000 catalog matching, family ladders, bridge shades, and grayscale value-gap analysis.
- **Thread Map (`lib/dmc/map/`):** Deterministic k-medoids thread ladder (`engine.ts`), speckle smoothing (`smooth.ts`), shared-edge vector contours (`contours.ts`), undo/redo (`history.ts`), and printable cards (`card.ts`).

### Comlink Web Workers (`lib/workers/`)
`lib/workers/index.ts` and `lib/workers/slot.ts` wrap four lazy singleton module workers with Comlink RPC, timeout handling, and termination/reset:
- `lib/paint/solver.worker.ts` — single-color spectral recipes
- `lib/paint/plan/plan.worker.ts` — whole-picture paint plans
- `lib/dmc/map/threadMap.worker.ts` — DMC Thread Maps
- `lib/workers/imageProcessor.worker.ts` — canvas image/value analysis

---

## 4. Persistence Map

| Surface | Mechanism | Keys / Location | Safety & Invariants |
| --- | --- | --- | --- |
| **Simple Library** | Browser `localStorage` | `colorwizard-simple-library-v2` (`lib/colorLibrary.ts`), one-way read migration from `colorwizard-simple-saved` (`lib/simpleSavedColors.ts`) | **Strict parse / never overwrite unreadable:** corrupt data keeps storage untouched and disables save/restore. JSON backup/restore in `lib/libraryBackup.ts` merges without deleting. |
| **Simple Canvas Setup** | Browser `localStorage` | `colorwizard-canvas-setup-v1` (`lib/paint/canvasSetup.ts`) | Keyed by SHA-256 of image bytes; strict validation returns `null` rather than a partial draft. |
| **Simple Thread Map & UI prefs** | Browser `localStorage` | `colorwizard-simple-thread-map-prefs` (`lib/dmc/map/prefs.ts`), `colorwizard-simple-plan-budget` (`SimpleApp.tsx`), `colorwizard-simple-phone-view` (`useThreadStudioState.ts`) | Corrupt values are ignored safely; locks/swaps/history stay session-only. |
| **Workbench Stores** | Zustand `persist` (`lib/store/storage.ts`) | `lib/store/` (`useSessionStore`, `useCanvasStore`, `usePaletteStore`, `usePaintPaletteStore`, `useCalibrationStore`, `useLayoutStore`, `useDmcStore`, `useStitchStore`) | `useDmcStore` (`colorwizard-dmc-inventory`) is shared with Thread Studio's owned-skein box. |
| **Desktop Projects & State** | Tauri v2 + SQLite (`colorwizard.db`) | `src-tauri/src/commands.rs`, `lib/desktop/tauriClient.ts`, `components/desktop/TauriPersistence.tsx` | Managed `OnceCell<SqlitePool>` with WAL mode, `foreign_keys = ON`, and transactional saves (atomic delete+insert rollback on failure). Native image fallback reads (`cw_read_file_as_data_url`) allowlist image extensions and enforce a 50 MB size cap. |

---

## 5. Day-1 Commands & Quality Gates

Requires Node.js 20 (see `.nvmrc`). No environment variables are needed.

```bash
# Local development
npm run dev                  # Next.js web dev server at http://localhost:3000 (runs generate:data)
npm run tauri:dev            # Desktop dev shell (macOS + Tauri prerequisites)

# Fast feedback vs. full verification
npm run test:fast            # Unit & component tests (~10s; skips **/benchmark.test.ts ratchets)
npm test -- --run            # Full Vitest suite including paint/plan accuracy ratchets (CI)

# Static & data quality gates
npm run lint                 # ESLint across app/, components/, hooks/, lib/
npm run typecheck            # tsc on app tsconfig + tsconfig.test.json
npm run validate:paints      # Verify paint palette integrity and manifest checksums/counts
npm run unreachable:check    # Fail on new unreferenced source files outside scripts/unreachable-baseline.json

# Production builds
npm run build                # Static web export to out/
npm run build:desktop        # Static desktop export to out/ (COLORWIZARD_DESKTOP=1 + relative assets)

# Browser smoke tests (Playwright against a running server)
npm run smoke:core           # Core Simple flows (welcome, sampling, demo, library, phone Thread view)
npm run smoke:canvas         # Canvas setup, crop/grid, landmarks, mix trials, and 3-page print packet

# Desktop Rust checks
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml
```

---

## 6. Deep-Dive Docs

- [`CLAUDE.md`](CLAUDE.md) — Authoritative engineering handbook: feature invariants, wording/caveat rules, open edges, and verification discipline.
- [`docs/paint-accuracy-audit.md`](docs/paint-accuracy-audit.md) — Per-color recipe solver accuracy methodology and benchmark history.
- [`docs/paint-plan-audit.md`](docs/paint-plan-audit.md) — Whole-picture planner algorithm choices, chroma/value tuning, and corpus measurements.
- [`docs/painting-process.md`](docs/painting-process.md) — Underpainting process stage design notes.
