# Plan: Grid + Doodle Grid Implementation

## 1. Algorithm: Procedural Doodle Generation
We need a deterministic but random-looking pattern generator that provides high-contrast landmarks for alignment.

### Core Logic (`lib/grid/doodleGenerator.ts`)
-   **Input:** `width`, `height`, `density` (low/medium/high), `seed` (optional).
-   **Output:** SVG Path string or Canvas draw instructions.
-   **Algorithm:**
    1.  **Grid Partitioning:** Divide the canvas into a coarse grid (e.g., 5x5 cells) to ensure even coverage.
    2.  **Anchor Points:** Generate 1-2 random points within each cell.
    3.  **Path Generation (Squiggles):**
        -   Create 3-5 distinct "layers" (paths).
        -   For each layer, select a subset of anchor points.
        -   Connect points using `cubicBezier` curves with randomized control points to create "loops" and "waves".
        -   Avoid sharp corners; prioritize smooth, flowing lines (easier to trace).
    4.  **Landmarks (Glyphs):**
        -   Place distinct symbols (Triangle, Circle, X, Star) at random empty spots.
        -   These serve as hard anchor points for "locking" the eye.
    5.  **Styling:**
        -   High contrast colors: Neon Cyan, Magenta, Lime Green, Bright Yellow.
        -   Variable stroke width (thick lines for main loops, thin for details).

## 2. UI Flow & Workflow

### Location: `projects/colorwizard/app/trace/page.tsx`
We will expand the existing Grid Overlay into a full **Overlay Manager**.

### Tabs / Modes
1.  **Classic Grid** (Existing)
    -   Square, Rule of Thirds, Golden Ratio.
2.  **Doodle Grid** (New)
    -   **Sub-mode A: Generator** (Digital-to-Physical)
        -   *Action:* Generates a random doodle pattern over the Reference Image.
        -   *Use Case:* User projects this composite onto a wall/canvas to trace the doodles first.
        -   *Controls:* "Regenerate", "Density Slider".
    -   **Sub-mode B: Transfer** (Physical-to-Digital)
        -   *Action:* User takes a photo of their scribbled wall ("Background").
        -   *Overlay:* User loads Reference Image ("Foreground").
        -   *Interaction:* User uses touch gestures (pinch/rotate/pan) to align Foreground to Background using the scribbles as visual guides.
        -   *Output:* A "locked" composite view. The user toggles between "Composite" and "Reference Only" to paint.

### User Journey (Mural/Large Scale)
1.  **Setup:** Artist scribbles randomly on the wall.
2.  **Capture:** Artist opens ColorWizard Trace -> "Doodle Mode" -> "Capture Background".
3.  **Align:** App overlays Reference Image. Artist adjusts opacity and aligns image features to wall scribbles.
4.  **Paint:** Artist puts phone away (or uses it as a map). Looks at wall: "Okay, the eye starts at the intersection of the blue loop and the red X."

## 3. Engineering Tasks

### Phase 1: Core Logic
- [ ] Create `lib/grid/doodleGenerator.ts`
    -   Implement `generateDoodlePath(width, height, config)` function.
    -   Implement `generateLandmarks(width, height, config)` function.
- [ ] Update `lib/types/canvas.ts`
    -   Add `GridType: 'classic' | 'doodle'`.
    -   Add `DoodleConfig` interface.

### Phase 2: Components
- [ ] Create `components/canvas/DoodleOverlay.tsx`
    -   Renders the generated SVG paths.
    -   Accepts opacity and config props.
- [ ] Update `components/canvas/GridControlsPanel.tsx` (or TracePage equivalent)
    -   Add "Doodle" tab.
    -   Add controls for Density/Regenerate.

### Phase 3: Trace Page Upgrade
- [ ] Modify `app/trace/page.tsx`
    -   Add state for `backgroundMode`: `'live-camera' | 'static-image'`.
    -   Implement `StaticBackgroundCapture` (take photo from video stream).
    -   Implement `ImageCompositor` (overlay Ref on Static Background).
    -   Add "Lock/Unlock" toggle for touch gestures (so you don't accidentally move the reference while painting).

### Phase 4: Polish
- [ ] Add "Export Doodle Grid" (save the generated pattern as PNG/SVG for projection).
- [ ] Add "High Contrast Mode" (invert colors for dark surfaces).
