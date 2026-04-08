# ColorWizard Pro Design Canon

Status: canonical

This document defines the "warm paper workbench" design language for ColorWizard Pro.

Read this before making UI changes. If any current surface in the app contradicts this document, this document wins.

This canon was extracted from the parts of the codebase that already speak the right dialect: the global token layer, the workbench rail, the compact toolbar, the desktop frame, the sample inspector, the DMC match list, and the better paper-based empty states.

## Design Intent

ColorWizard Pro should feel like a real painter's instrument, not a web app in a shell.

The target is:

- warm, matte, quiet
- materially honest
- editorial, not decorative
- precise without feeling clinical
- alive without feeling animated

The closest references are not SaaS dashboards. They are printed manuals, tool benches, reference books, index cards, and calm desktop tools with considered motion.

## Color Tokens

These are canonical values, not descriptions.

### Paper

- `--paper-shell: #F5F0E8`
- `--paper: #F2F0E9`
- `--paper-elevated: #FAFAF7`
- `--paper-recessed: #E8E6DF`

### Ink

- `--ink: #1A1A1A`
- `--ink-secondary: rgba(26, 26, 26, 0.70)`
- `--ink-muted: rgba(26, 26, 26, 0.50)`
- `--ink-faint: rgba(26, 26, 26, 0.25)`
- `--ink-hairline: rgba(26, 26, 26, 0.10)`

### Graphite / Warm Secondary Structure

- `--graphite: #6D5E49`
- `--graphite-muted: #8F7F69`
- `--linen: #DDD1C0`
- `--linen-strong: #C7BAA5`

### Accent

- `--signal: #C82319`
- `--signal-hover: #A81D15`
- `--signal-muted: rgba(200, 35, 25, 0.15)`
- `--subsignal: #566D7B`
- `--subsignal-hover: #455A66`
- `--subsignal-muted: rgba(86, 109, 123, 0.15)`

### Semantic Use

- Primary decisive action and destructive emphasis use `signal`.
- Utility-active state, instrumentation state, and informational toggles use `subsignal`.
- Default structure should rely on paper and ink first, not accent color.
- Disabled states use reduced ink contrast and opacity. They do not introduce gray-blue UI chrome.
- There is no generic SaaS primary blue in the canon.

## Surface Treatments

The app should feel built from paper, board, and ink. Not glass, neon, or graphite plastic.

### Panel

Use for inspector sections, list containers, and dock groupings.

- Background: `paper-elevated` or `paper-recessed`
- Border: 1px `ink-hairline` or `linen`
- Radius: 12px to 18px
- Shadow: `0 1px 3px rgba(26, 26, 26, 0.04)` at rest
- Inner lighting: optional `inset 0 1px 0 rgba(255,255,255,0.55)` when it helps establish paper thickness

### Card

Use for project cards, recipe blocks, and modal subsections.

- Background: `paper-elevated`
- Border: 1px `linen` or `ink-hairline`
- Radius: 16px to 24px
- Shadow: `0 4px 12px rgba(26, 26, 26, 0.06)`
- On hover: deepen edge and lift shadow one step; do not tint blue

### Modal

Use for focused editing tasks and gated flows.

- Body: paper, never gray-900
- Header/footer separation: yes
- Border: warm, quiet, structural
- Radius: 20px to 28px
- Shadow: around `0 20px 80px rgba(26, 26, 26, 0.18)`
- Backdrop: dim the room, do not stylize it
- Backdrop range: roughly `bg-black/28` to `bg-black/40`
- Blur: only when clarifying layer separation, and kept low

### Instrument Cluster

Use for HUDs, floating canvas controls, zoom controls, minimap housing, and highlight controls.

- Background: paper-tinted translucent raft, not black glass
- Good range: `rgba(250, 250, 247, 0.84)` to `rgba(250, 250, 247, 0.95)`
- Border: 1px `ink-hairline`
- Radius: 14px to 20px
- Shadow: around `0 12px 28px rgba(26, 26, 26, 0.12)` to `0 12px 28px rgba(26, 26, 26, 0.14)`
- Labels: compact, uppercase, ink-muted
- Readouts: mono, tabular, crisp

### Border Language

- Hairlines are the default.
- 2px borders are reserved for selection or active state.
- Borders exist to define edges and planes, not to decorate.

### Shadow Language

- Shadows should feel like separation from a desk surface, not elevation in a mobile UI kit.
- Most shadows should be broad and soft.
- Avoid stacked glow, colored shadows, and glossy depth tricks.

### Grain / Texture

- The intended finish is matte paper tooth, not blur-heavy translucency.
- Large shell surfaces may carry a bundled monochrome grain layer at 1-2% opacity.
- If the grain asset is not present, stay with flat paper tones rather than faking texture with gradients.
- Do not use glassmorphism as a substitute for material depth.

## Type System

### Families

- Display: `EB Garamond`
- UI: `Helvetica Neue`, `Helvetica`, `-apple-system`, `Arial`, `sans-serif`
- Mono: `JetBrains Mono`, `SF Mono`, `Menlo`, `Consolas`, `monospace`

### Roles

- Wordmark, project titles, and calm headings use display.
- Buttons, labels, tabs, metadata, and inspector body copy use UI.
- Measurements, HEX, RGB, HSL, zoom, percentages, and ratios use mono.

### Sizes

Canonical scale:

- 11px
- 13px
- 15px
- 18px
- 22px
- 28px
- 36px

### Weights and Tracking

- Display: mostly 400-500
- UI body: 500
- UI labels and controls: 600
- Readouts: 500-700 mono
- Display tracking: `-0.01em` to `-0.02em`
- Eyebrows and micro labels: uppercase with wide tracking around `0.1em`

### Numerals

All values that represent tools or measurements should be set as technical data:

- tabular numerals
- mono family
- strong contrast

This includes:

- HEX
- RGB
- HSL
- zoom %
- value %
- step counts
- mixing ratios
- timestamps or project metadata when shown in tool contexts

## Motion Vocabulary

Motion should behave like weight, not animation.

### Default Ease

- `cubic-bezier(0.16, 1, 0.3, 1)`

### Durations

- fast: `120ms`
- normal: `200ms`
- slow: `300ms`
- overlay fade range: `160ms` to `180ms`

### When To Ease

Use easing for:

- button hover
- button press release
- chip and row state changes
- tint, border, and shadow transitions
- small panel reveals

### When To Spring

Use springs only for:

- direct manipulation
- drawers
- large spatial overlays
- object settling after drag or zoom

Current quiet spring behavior is close to:

- dialogs: stiffness `360`, damping `32`
- drawers: stiffness `320`, damping `34`
- object settle: stiffness `300`, damping `25`

### What Weight Means Here

- quick start
- deliberate deceleration
- one settle
- no bounce for bounce's sake
- no exaggerated overshoot

### Motion Rules

- Avoid `transition: all` in canonical surfaces.
- Keep reveal offsets subtle, around 8px to 10px.
- No generic slide-and-fade utility animations as the default language.
- The app should feel edited, not animated.

## Interaction Language

This is principle, not implementation detail.

### Hover

- Hover clarifies edge, density, or affordance.
- It may deepen shadow, reveal a hairline, or warm the paper slightly.
- It should not shout with bright chroma shifts.

### Press

- Press should feel compressed, not rubbery.
- Prefer slight shadow collapse and tonal compression over obvious scaling.
- If scale is used, keep it subtle, around `0.98`.

### Focus

- Focus should feel integrated into the object.
- Avoid detached browser-outline energy.
- Use internal edge treatment, subtle tint, or controlled ring language that matches the paper system.

### Drag

- Drag should communicate tool-state continuity.
- The final system should not rely on raw browser cursors like `grab`, `grabbing`, or `col-resize`.
- Direct manipulation should feel instrumented and intentional.

### Selection

- Selection is persistent tint plus edge.
- `signal` is for decisive selection.
- `subsignal` is for utility-active selection.
- Selection should never depend on color alone; shape, edge, or marker must reinforce it.

### Disabled

- Disabled controls stay legible but quiet.
- Reduce contrast and interaction affordance.
- Do not fog the whole interface or block large areas with generic overlays.

### Empty States

- Empty states must preserve architecture and intent.
- A blank rounded rectangle is not an empty state.
- Even when empty, the app should imply what kind of instrument this is.

## Canonical Anti-Patterns

These are out of dialect and should be treated as debt:

- dark gray SaaS cards
- bright blue primary buttons
- purple export buttons and purple upgrade gradients
- black glass HUDs
- excessive backdrop blur
- emoji-led upgrade or feature surfaces
- generic `animate-in` slide/fade patterns as a default motion system
- raw browser alerts and confirms
- default select styling
- stock browser cursor vocabulary as the finished interaction language

## Execution Order

Phases should ship in working slices. The order below is canonical.

### Phase 1: Remove the SaaS Dialect

Highest ROI. Fix the surfaces that most obviously contradict the canon:

- modal stack
- upgrade flows
- paint recipe
- color wheel
- harmonies
- AI suggestions
- export gating surfaces

These are currently the loudest gray/blue/purple offenders.

### Phase 2: Rebuild the HUD / Instrument Cluster

Unify:

- canvas HUD
- floating canvas controls
- zoom controls
- minimap housing
- highlight controls

Goal: one coherent paper-based instrument language.

### Phase 3: Chrome and Ambient Detail

Then address:

- workbench rail
- compact toolbar refinement
- resize affordances
- focus/select/range chrome
- scrollbars
- cursor system
- desktop frame
- empty states
- project loading states
- dead corners and inert transitions

This is the pass that removes the remaining "HTML in a window" residue.

## Legacy Quarantine

Unreferenced legacy components should be quarantined, not deleted.

Likely quarantine candidates include:

- `components/ColorPanel.tsx`
- `components/PaletteSelector.tsx`
- `components/ValueCompareCanvas.tsx`
- `components/PinnedColorsPanel.tsx`
- `components/CurrentColorBadge.tsx`
- `components/ColorNamingDisplay.tsx`
- `components/ValueChromaGraph.tsx`

Rules:

- Do not delete them during the native-feel pass.
- Do not let them define the canon.
- If one must be revived later, it should be refit to this document before re-entry.
