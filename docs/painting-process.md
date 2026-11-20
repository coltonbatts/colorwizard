# Painting process view

Status: design agreed 2026-11-18. **Slice 1 built 2026-11-18, committed 2026-11-20** (see below). Decisions from the owner:
brunaille underpainting first, a new view in the web simple app (next to Value and Plan),
works on the open picture only (no gallery, nothing new stored).

## What it is

A slider that takes the open picture (typically a Midjourney oil-painting image) from a blank
toned canvas to the finished image through the stages of a classical indirect oil painting.
Each stage shows what the canvas looks like at that point, what to mix, and what to check.

It is a **calculated teaching simulation**, not a record of how the image was made: a
Midjourney image has no process. Every stage is derived from the finished pixels. The view
must say so, and inherits `MODEL_CAVEAT` wherever it shows paint.

## Stages (slider stops; the slider crossfades between neighbours)

| # | Stage | How it is rendered | Paint guidance shown |
|---|-------|--------------------|----------------------|
| 0 | Toned ground (imprimatura) | Flat thin wash, a mid-light warm earth (about value 6) | One mix: ochre + touch of red + black, thinned. Why: kills the white, sets a middle value |
| 1 | Drawing / lay-in | Edges of a heavily blurred copy, drawn thin and dark over the ground | Same brown, thinned. Big shapes only, no detail |
| 2 | Value massing (notan) | 3 values of the brunaille brown, big blur | The 3 browns, with value numbers |
| 3 | Brunaille underpainting | 5–7 brown values (`valueScale`/`valueMode`, perceptual L*), medium blur | Each brown as a Core-six recipe (spectral solver), value number, "lean: thin, little oil" |
| 4 | Dead color / block-in | Plan piles at budget 5 over the underpainting, big blur | The 5 piles from the existing Plan, unchanged |
| 5 | Develop | Plan piles at budget 8–12, less blur | Piles at 8/12 |
| 6 | Finish | Original image; highlights and darkest accents last | "Fat over lean: thicker, more oil in final layers"; value check vs. original |

Value matching runs throughout: at any stop, a toggle compares the stage's values against the
original's values (reusing the Value view's quantizer) and marks regions that are off.

## Reuse, do not change

- Plan piles: call the existing `planPicture` / plan worker at budgets 5 / 8 / 12. Do not touch
  `lib/paint/plan/` algorithms, the solver, or the tinting-strength constants.
- Values: `lib/valueScale.ts` (L*-based value), `lib/valueMode.ts` quantizers.
- Brunaille browns: solve the target browns with `solveRecipe` on the Core six (no umber in it).
- New code: `lib/paint/process/` (pure stage renderers + stage text, unit-tested) and
  `components/simple/ProcessPanel.tsx`; stage wording in one module, never in components.

## Slices

1. Stage renderers 0–3 (ground, lay-in, notan, brunaille) + slider + stage text, on a ≤512 px copy in a worker.
2. Stages 4–6 via existing Plan piles; crossfade.
3. Value-match overlay; brunaille recipes.
4. Later, if wanted: grisaille/verdaccio, a saved gallery, a printable process card.

## Needs the owner's OK

All user-facing stage wording (new trust-related copy), the keyboard shortcut, and any change
to existing Plan or Value wording.

## Slice 1 as built (2026-11-18)

- `lib/paint/process/stages.ts` (frames, value bands, blur, edges, crossfade), `brown.ts` (brown
  for a perceptual value), `stageCopy.ts` (all wording, draft), `stages.test.ts` (13 tests).
- `components/simple/ProcessPanel.tsx` + "Process" toolbar button in `SimpleApp` (no shortcut).
  Plan and Process are exclusive; the canvas shows the stage, "Hold for original" (B) peeks,
  Value (V) works on the stage. Clicks don't sample in Process view.
- Runs on the main thread, not a worker: building all four frames on a 512 px copy took about
  80 ms in Chrome, so a worker wasn't worth it yet.
- Massing = 3 bands of a 1/40-side blur; underpainting = 6 bands of a 1/120-side blur, by 1-D
  k-means on perceptual value; lay-in = the massing's band edges over the ground.
- Checked: unit tests, full suite (742), tsc, eslint; Chrome via Playwright at 1440×900,
  1366×768, 768×1024, 390×844 (no page errors). Not checked: Safari, real devices, real
  Midjourney images (none found on this machine).
- Known: the toolbar now wraps to two rows in the 340 px desktop panel (five buttons).
  The underpainting's hard band steps read like a contour map on photos.
