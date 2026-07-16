# ColorWizard UI Modernization Audit

Date: July 16, 2026

Baseline: `eae9cc80` on `main`

Implementation branch: `codex/colorwizard-ui-modernization`

## Repository Baseline

- `main`, `origin/main`, and `HEAD` all resolved to `eae9cc80` after `git fetch origin --prune`.
- The working tree was clean before modernization work began.
- The stale `heuristic-ramanujan` worktree remains untouched.
- The original July 15 redesign is preserved at `codex/rescue-july15-original-ui` (`9832dedc`).

## Redesign Archaeology

The original redesign changed 25 files and 1,832 lines. Rebasing it onto the July application retained five files, then the production compatibility commit added legacy variables required by the current component layer.

### 1. Already Represented in Current Main

- Warm, tactile studio surfaces and calmer borders in `app/globals.css`.
- Accessible range controls and semantic channel labels in `PhotoshopColorWheel`.
- A labeled grid fieldset and explicit input names in `GridControlsPanel`.
- Warm, legible color naming and paint-puddle presentation.
- Reduced-motion handling, visible global focus, and the paper/ink/signal design canon.
- Clear canvas, mode rail, toolbar, inspector, and result-panel separation in the July workbench.

### 2. Still Relevant and Worth Adapting

- The old redesign's emphasis on control roles instead of one-off utility colors.
- Its labeled controls, pressed states, semantic regions, and keyboard-resizable inspector.
- The simpler editorial empty-state story: load, sample, then mix/match/save.
- Calmer paint-recipe presentation and technical readouts using tabular mono numerals.
- Stronger mobile navigation grouping and intentional touch targets.
- Session colors presented as a working strip rather than decorative swatches.

### 3. Obsolete Because the Workflow Changed

- The January `app/page.tsx` split layout and tab bar. The current workbench rail, floating inspector, and responsive core shell supersede it.
- `SimpleAdvancedToggle`, `PaletteTab`, and other deleted/renamed tab structures.
- January assumptions about DMC, saved cards, and mobile dashboards that predate Stitch, Deck, Reference, Structure, Surface, the desktop runtime, and the July stores.
- The old hydration workaround in the monolithic store; persistence is now distributed across current stores and bootstrap logic.

### 4. Potentially Harmful or Incompatible

- Restoring the 1,362-line CSS append as a unit. Current CSS already contains compatibility rules and additional workbench/print behavior; another append would increase override ambiguity.
- Restoring the old 768px breakpoint model. The current app intentionally switches desktop/mobile structure at 1024px.
- Replacing current `app/layout.tsx`; it now includes offline fonts, desktop runtime detection, auth/bootstrap, metadata, and a boot fallback.
- Reinstating January sidebar/mobile components over July behavior.
- Cherry-picking `9832dedc`, which would overwrite current component contracts and omit newer modes.

### 5. Required Visual Inspection

- Compact toolbar density at laptop height.
- Mix Lab hierarchy after the solver completes.
- Library, Stitch, and gated content that still use a gray/blue/purple component dialect.
- Tablet and mobile sheet heights, drawer vocabulary, and primary action placement.
- Canvas HUD/control styling across normal, value, stitch, and surface modes.

## Current Experience Audit

### What Works

- The empty state is calm, legible, and immediately communicates the three-step workflow.
- The loaded desktop workspace is canvas-first and reads as a creative instrument rather than a generic dashboard.
- Mode rail grouping, inspector titles, canvas readout, and the demo-color solver create strong orientation.
- Threads and Stitch preserve the canvas while adapting it to each task.
- Focus is visible on primary controls and no horizontal overflow appeared at 1440x900, 1366x640, 768x1024, or 390x844.
- The Terracotta demo completed successfully with no browser console errors.

### Highest-Impact Problems

1. `app/globals.css` contains two overlapping token dialects: canonical paper/ink/signal variables and independent `studio-*` values. This creates inconsistent accents, surfaces, radii, and typography.
2. Mix Lab is information-rich but overly dense. On a 1366x640 laptop the inspector moves below the canvas and only its opening section is visible without scrolling.
3. Critical labels and explanatory copy frequently fall below 12px; the laptop Mix view exposed 176 visible elements below 12px.
4. Library, upgrade/gating, export, and some modal paths still show gray/blue/purple SaaS styling that contradicts the design canon.
5. Mobile uses a coherent dedicated layout, but its drawer, bottom navigation, and sample sheet use different naming/grouping than desktop. Mix is embedded in Sample, while desktop-only tools should remain clearly scoped instead of appearing missing or broken.
6. Legacy and current CSS are co-located in a 3,235-line global file, increasing selector and override risk.

### Responsive Findings

- Desktop at 1440x900 is well balanced.
- Laptop height at 1366x640 uses the narrow stacked layout; the canvas remains useful, but the inspector becomes visually secondary.
- Tablet at 768x1024 avoids overflow but the bottom navigation competes with a long scrollable sample dashboard.
- Mobile at 390x844 is readable and intentionally composed; the fixed navigation and sheet need consistent safe-area and content-padding rules.
- The mobile drawer exposes the mobile-supported workflow (Sample, Threads, Stitch, Deck, settings). Desktop-only modes should be described and scoped consistently rather than routed into the wrong mobile panel.

### Accessibility Findings

- Global focus treatment is visible and tested on the mobile menu control.
- The skip link and main landmark are present.
- Selected rail modes use both an edge treatment and `aria-pressed`.
- Remaining risks include very small explanatory text, inconsistent native-select focus treatment, decorative emoji in gated/empty surfaces, and touched legacy controls that use `outline-none` without a matching ring.
- Drawers and sheets need consistent overscroll containment and dialog focus behavior.

## Modernization System

### Color Roles

- `paper-shell`: application background.
- `paper`: primary work surface.
- `paper-elevated`: inspectors, menus, and controls.
- `paper-recessed`: selected rows, wells, and grouped controls.
- `ink` through `ink-faint`: content hierarchy.
- `signal`: decisive primary/destructive actions only.
- `subsignal`: active instrument state and informational controls.
- `success`, `warning`, and `danger`: semantic status, never decoration.
- `studio-*` remains only as a compatibility alias to canonical roles.

### Surface Hierarchy

- Shell: flat paper, no shadow.
- Canvas stage: one framed work surface with a quiet broad shadow.
- Inspector: elevated paper with a hairline border.
- Section: spacing and rules before cards; use a card only when content is independently actionable.
- Floating instrument: compact translucent paper, one border, one shadow.

### Type and Spacing

- Display: EB Garamond for wordmark and calm headings.
- UI: system Helvetica stack for controls and body copy.
- Mono: JetBrains Mono for measurements and color values.
- Canonical sizes: 11, 13, 15, 18, 22, 28, 36px; 11px is reserved for metadata, not instructions.
- Base rhythm: 4px; common control gaps 8/12px; section spacing 16/24/32px.

### Geometry and Elevation

- Controls: 6-8px radius, 40px desktop height, 44px touch height.
- Panels/instruments: 10-14px radius.
- Cards/modals: 14-22px only where the object is meaningfully independent.
- Hairline borders are the default; 2px is selected/focused only.
- Shadows are broad, warm, and limited to stage, inspector, popover, and dialog separation.

### Interaction and Motion

- Hover increases edge/ink contrast.
- Press compresses tone/shadow, with at most a 1px translation.
- Selected state uses tint plus edge/marker.
- Disabled controls remain legible at reduced contrast.
- Motion is 120-200ms for controls and 200-300ms for spatial layers; reduced motion removes non-essential transforms.

## Prioritized Implementation Sequence

1. Consolidate tokens and shared primitives without removing compatibility aliases.
2. Normalize the workbench chrome, inspector headers, focus, controls, fields, and responsive sizing.
3. Refine Mix Lab, color wheel, recipe, and canvas instrument density.
4. Bring Threads, Stitch, Library, Deck, and gated surfaces into the same paper/ink language.
5. Refine mobile drawer, header, bottom navigation, and sheet safe-area behavior.
6. Run tests/build, then repeat desktop/laptop/tablet/mobile visual and keyboard checks.

## Implementation Outcome

- Consolidated the `studio-*` compatibility layer onto the canonical paper/ink/signal roles instead of introducing a second CSS system.
- Preserved the canvas-first July workbench and corrected the short-laptop breakpoint so the stage and inspector remain side by side at 1366x640.
- Replaced the animated empty-state ornament with a quiet material-color mark and retained the existing upload/demo behavior.
- Refined Mix Lab, recipes, harmonies, AI guidance, Stitch, Paint Library, license gates, exports, and mobile navigation without changing color-science or persistence logic.
- Rebuilt the touched palette and licensing dialogs on the shared overlay primitive, including initial focus, focus restoration, Escape close, explicit labels, and announced errors.
- Verified zero horizontal overflow and zero visible text below 11px in the loaded workflow at 1440x900, 1366x640, 768x1024, and 390x844.
- Verified the empty state, Terracotta demo, loaded workspace, Mix solver results, Library selection/dialogs, Stitch, license gating, mobile navigation, and visible keyboard focus with no browser console errors.
- `npm test -- --run`: 36 files and 356 tests passed.
- `npm run build`: passed; reported only the existing repository warning set.
- `npm run smoke:core`: could not launch because the local Playwright Chromium executable is not installed; the failure occurred before the script reached the application.
