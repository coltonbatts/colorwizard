# Paint plan audit

Measured 2026-09-28 (Node 22, one machine, one run of timings). The subject is the whole-picture paint plan: given a picture, a palette and a pile budget, "mix these N piles, here is where each goes". Reproduce with:

```bash
npm run benchmark:plan -- --reference     # Core six, budgets 5/8/12, ~2.5 min
npm run benchmark:plan -- --palette zorn --reference
npm run benchmark:plan -- --algo naive --budgets 8 --json out.json
npx vitest run lib/paint/plan             # fast ratchets, ~16 s
```

This file has the **baseline** (Phase 1). It says what is weak before anything is fixed. Fixes and their before/after numbers are appended below as they land.

## What this can and cannot prove

**Every plan is scored against spectral.js's own forward model, on generated pictures.**

- The repo has no measured paint swatches, so like `docs/paint-accuracy-audit.md` this measures search quality and internal consistency. It does **not** show that a recipe reproduces its color when mixed from real tubes. The tinting-strength constants and the "weights are spectral.js factors, not volumes" question (accuracy audit §5) are untouched and still unvalidated. Every plan UI must carry `MODEL_CAVEAT`.
- The corpus is nine 256×192 pictures **drawn by code** (`lib/paint/plan/fixtures/`), not photographs. They cover the regimes a painter meets (two portraits, landscape, warm interior, high-key, low-key, low-chroma still life, sunset, saturated fruit) but are cleaner and simpler than real pictures: no fine texture, few hues per scene, no lens or JPEG artifacts. Numbers compare algorithms on this mix of colors. They do not say how a plan looks on your photo. Real PNGs dropped into that folder are picked up automatically as a separate group.
- Nine pictures is a small sample. One k-means seed moves the mean by about 0.2 ΔE00 (see "Seed sensitivity"), so differences smaller than that are noise.

## Metrics

All in `lib/paint/plan/metrics.ts`, pure and browser-safe. Distances are **ΔE00 (CIEDE2000)** between colors as hex, the same definition as `recipe.error00`, so the numbers line up with the labels users see.

| metric | meaning |
|---|---|
| mean / p95 ΔE00 | Area-weighted (every pixel counts once): distance from each pixel to the **predicted swatch** of the pile it is assigned to, not to the ideal cluster center. |
| assignment | Each pixel goes to the pile with the nearest predicted swatch in ΔE00. That is the best repaint these piles allow, and what the app will show. (`center` mode, nearest solved-for target, is reported once as a diagnostic.) |
| value error | Area-weighted mean \|ΔL*\|. Painters mass by value first. |
| unreachable area | Share of pixels in piles whose label is **Poor**: the pile's swatch is over 5 ΔE00 from the color the pile was solved for. This is what the UI's "can't mix this" wording will mark. |
| visibly off | Share of pixels more than 5 ΔE00 from their own pile's swatch, whatever the pile's label says. Pixel level, so it also includes what the pile budget costs. |
| parts / unpaintable / pigments | Whole parts to measure across piles with a clean ratio; piles with no clean ≤16-part ratio (percentages only); distinct pigments in the plan. |
| minor piles | Piles that end up covering under 2% of the picture. |
| runtime | Wall time for the whole plan, including every solve (Node, solves in series). |
| shared-base score | Not defined yet: it needs piles derived from other piles, which do not exist until Phase 2. |

"Summary" rows give every picture equal weight (mean of the per-picture means), not pooled pixels.

## The baseline algorithm (`lib/paint/plan/naive.ts`, frozen)

1. Histogram of the picture's colors (each distinct color once, its pixel count is its area).
2. Area-weighted k-means in OKLab, k-means++ seeding, fixed seed (1), k = pile budget.
3. `solveRecipe` on each cluster center independently.

It never changes: it is the reference for every algorithm added later (`--algo naive`).

## Baseline results, Core six (seed 1, deterministic)

Summary, nine pictures:

| piles | mean ΔE00 | p95 (mean / worst) | value err ΔL* | visibly off | Poor-pile area (mean / worst) | parts | piles with no clean ratio | pigments | minor piles | ms p50 / p95 |
|---|---|---|---|---|---|---|---|---|---|---|
| 5 | 6.46 | 13.04 / 19.13 | 3.34 | 52.8% | 25.2% / 83.6% | 36.0 | 20.0% | 4.3 | 0.2 | 510 / 636 |
| 8 | 4.92 | 9.97 / 17.09 | 2.49 | 38.2% | 19.0% / 77.1% | 47.3 | 29.2% | 4.9 | 0.9 | 892 / 1063 |
| 12 | 4.55 | 8.93 / 17.23 | 2.07 | 32.5% | 17.1% / 82.0% | 77.0 | 21.3% | 5.3 | 2.9 | 1200 / 1493 |

Per picture:

| picture | mean ΔE00 @5 / 8 / 12 | visibly off @5 / 8 / 12 | Poor-pile area @5 / 8 / 12 | piles with no clean ratio @8 | pile <2% area @12 |
|---|---|---|---|---|---|
| fruit-saturated | 7.26 / 5.59 / 5.05 | 56% / 37% / 35% | 0% / 5% / 4% | 2 of 8 | 3 |
| high-key | 2.65 / 2.01 / 1.97 | 4% / 3% / 2% | 0% / 0% / 0% | 6 of 8 | 4 |
| interior-warm | 6.56 / 4.87 / 4.05 | 56% / 47% / 30% | 30% / 5% / 5% | 4 of 8 | 1 |
| landscape | 7.37 / 6.16 / 5.57 | 75% / 68% / 57% | 0% / 29% / 25% | 4 of 8 | 1 |
| low-key | 5.73 / 4.17 / **4.54** | 53% / 25% / **44%** | 39% / 37% / 20% | 1 of 8 | 7 |
| portrait-deep | 4.27 / 3.37 / 3.14 | 31% / 18% / 14% | 19% / 10% / 12% | 1 of 8 | 2 |
| portrait-light | 9.42 / 4.66 / 4.13 | 95% / 35% / 18% | 56% / 6% / 6% | 2 of 8 | 1 |
| still-life-muted | 4.39 / **4.49** / 4.05 | 20% / **31%** / 14% | 0% / 0% / 0% | 1 of 8 | 4 |
| sunset | 10.49 / 8.94 / 8.45 | 86% / 79% / 79% | 84% / 77% / 82% | 0 of 8 | 3 |

Pile labels (share of all piles): Excellent 9% / 11% / 7%, Good 31% / 28% / 26%, Fair 38% / 43% / 47%, Poor 22% / 18% / 19% at 5 / 8 / 12 piles.

Same measurement on the four-tube Zorn palette (white, black, ochre, cadmium red), to keep from tuning against one palette only:

| piles | mean ΔE00 | p95 (mean / worst) | value err | visibly off | Poor-pile area | parts | no clean ratio | minor piles | ms p50 / p95 |
|---|---|---|---|---|---|---|---|---|---|
| 5 | 7.99 | 14.26 / 24.09 | 3.42 | 57.6% | 41.4% | 33.6 | 17.8% | 0.2 | 95 / 115 |
| 8 | 6.55 | 12.17 / 20.68 | 2.55 | 43.5% | 33.1% | 47.2 | 25.0% | 1.0 | 159 / 177 |
| 12 | 6.40 | 11.63 / 20.57 | 2.05 | 41.0% | 32.9% | 74.0 | 17.6% | 2.9 | 227 / 258 |

## What is wrong or weak

Ordered by how much it matters. Items marked **measured** have a number; items marked **hypothesis** are what the evidence suggests and are not yet tested.

### 1. On near-neutral mid-tones the solver's objective and the plan's metric disagree. (measured on examples; size of the effect not yet measured)

The per-color solver minimizes OKLab distance. Plans are judged (and labeled) in ΔE00, which is much more sensitive to small hue and chroma errors near neutral. Many pictures are mostly near-neutral mid-tones (walls, shadows, haze), and in this corpus the largest pile is often one of them.

Worked example, the wall in `portrait-light` (56% of the picture at 5 piles, target `#807770`): the solver's own **unrounded** optimum is ΔE-OK 0.94 (the old OKLab labels would call that "Excellent") but **ΔE00 4.20**; rounding to 5 whole parts makes it **ΔE00 6.50**, labeled Poor. `#645854`: 1.94 unrounded, 3.70 printed. `#CCD3DC`: 4.43 unrounded, 4.78 printed.

Supporting evidence: in `high-key` and `still-life-muted` the 12-pile plan is *better* than solving each pixel on its own (below), which only happens when the per-color answer is not the best available in ΔE00.

Hypothesis: choosing recipes by ΔE00 among candidates, instead of taking the per-color solver's OKLab answer, recovers a large share of the plan's loss. I cannot change the solver (additive changes only), so this would live in plan code.

### 2. The pile budget is spent unevenly, and more piles can look worse. (measured)

- **Minor piles.** At 12 piles the average plan has 2.9 piles (24%) covering under 2% of the picture; `low-key` has 7 of 12. In its 12-pile plan three piles are near-identical dark browns whose swatches are near-neutral greys (`#0D0A08`→`#0D0D0D`, `#19120C`→`#151313`, `#251B12`→`#1F1F1C`), while six accent piles cover 0.5–1.3% each.
- **Non-monotonic.** Going to more piles made the mean ΔE00 *worse* in 2 of 9 pictures (`low-key` 4.17→4.54 from 8 to 12 piles, visibly off 25%→44%; `still-life-muted` 4.39→4.49 from 5 to 8). Adding a swatch can never worsen a nearest-swatch repaint, so this is purely the algorithm. Zorn also has two (`low-key` and `still-life-muted`, both from 8 to 12 piles).
- **Clusters are palette-blind.** k-means chooses centers without knowing what the palette can make, then the solver is asked for them. 18–22% of piles are labeled Poor.

### 3. Piles are heavy to paint, and many have no clean ratio. (measured)

At 5 / 8 / 12 piles the plan needs 36 / 47 / 77 measured parts in all (about 6.4 per pile), and **20% / 29% / 21% of piles have no clean ≤16-part ratio** (percentages only, which a painter cannot measure). In `high-key` 6 of 8 piles are unpaintable: near-white tints need a tiny amount of a strong pigment (phthalo strengths are 8–10× white), which does not fit in 16 parts. Cluster centers are mid-tone, low-chroma colors, the hardest case: the per-color audit found 23% unpaintable on curated colors and 13% overall.

### 4. Clustering is not value-first. (measured symptom, cause is hypothesis)

Mean value error alone is 3.3 / 2.5 / 2.1 ΔL* at 5 / 8 / 12 piles, against a mean ΔE00 of 6.5 / 4.9 / 4.6. k-means treats L, a and b equally, so piles go to hue variants rather than value steps. Painters plan by value first.

### 5. "Unreachable" by pile label understates what is visibly wrong. (measured)

A pile is labeled from its own target, not from the pixels it repaints. At 12 piles 17.1% of area is in Poor piles but **32.5% is visibly off** (>5 ΔE00 from its swatch). `landscape` at 5 piles has 0% Poor-pile area and **75% visibly off**. The UI must not present the label-based share as the honest number; show both, and lead with the pixel-level one.

### 6. Some of the loss is the palette, not the plan. (measured, and unfixable by the plan)

The reference below shows about a quarter of pixels are individually out of the Core six's reach, and `sunset` is 71% out of reach even with a pile per pixel (Zorn: 72%, `landscape` 90%, `fruit-saturated` 56%). No plan algorithm can fix that; it can only say so honestly.

### 7. Seed sensitivity is real. (measured)

See below. The baseline is deterministic, but its result depends on which seed was chosen, by about ±0.1 on the mean over pictures and by up to 2.2 ΔE00 on a single picture.

### What is fine

- **Determinism.** Same picture, palette and budget give an identical plan (tested, including with other solves in between). Different seeds are the only variation.
- **Runtime scales linearly at about 100 ms per pile** (Node, serial): p50 0.5 / 0.9 / 1.2 s at 5 / 8 / 12 piles on the Core six, p95 up to 1.5 s. The Zorn palette is 5× faster. A few seconds for 12 piles is met today. Anything that re-solves iteratively multiplies this.
- **Palette respected.** Plans use only the palette's tubes (tested on Zorn).
- **Assigning pixels to the nearest swatch, not the nearest target, is worth 0.24–0.28 ΔE00** (Core six; 0.27–0.42 on Zorn). It is already in the metric and in what the app will show, so the naive baseline is not penalized for it.
- **The per-color solver's labels are honest** (ratcheted in `benchmark.test.ts`); plans inherit them.

## Reference: solve each pixel on its own

120 area-weighted random pixels per picture (seed 7), each solved by the per-color solver. It shows what a pile per pixel would give **if** the solver's answer were the best available in ΔE00. It is not a strict floor (see item 1: two pictures beat it).

| picture | mean ΔE00 | own recipe Poor | 12-pile plan mean ΔE00 |
|---|---|---|---|
| fruit-saturated | 3.68 | 12.5% | 5.05 |
| high-key | 2.77 | 6.7% | 1.97 |
| interior-warm | 2.65 | 13.3% | 4.05 |
| landscape | 4.51 | 37.5% | 5.57 |
| low-key | 4.39 | 32.5% | 4.54 |
| portrait-deep | 2.94 | 18.3% | 3.14 |
| portrait-light | 3.60 | 14.2% | 4.13 |
| still-life-muted | 4.28 | 30.0% | 4.05 |
| sunset | 7.71 | 70.8% | 8.45 |
| **mean** | **4.06** | **26.2%** | **4.55** |

At 12 piles the plan is on average only 0.5 ΔE00 above this reference (standard error of a 120-pixel sample is roughly 0.3), so **at 12 piles better clustering alone has little room; at 5 piles there is 2.4**. Zorn: reference 5.99 mean, 38.1% Poor, against a 12-pile plan of 6.40.

## Seed sensitivity

The naive plan at 8 piles with k-means seeds 1–5, Core six:

| seed | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| mean ΔE00 over pictures | 4.92 | 4.94 | 4.93 | 5.10 | 4.96 |

Per picture the best-to-worst spread across seeds is 0.05–0.42 ΔE00, except `portrait-light`, **2.17** (4.66 to 6.83): with some seeds the big wall pile lands where the solver is poor. Consequences: (a) the ratchets pin seed 1, which is deterministic, but a gain under about 0.2 ΔE00 on the mean is within seed noise; (b) a deterministic algorithm that is not seed-dependent is worth something in itself.

## Limits of this audit

- Generated pictures, nine of them; no real photographs yet. Conclusions about ranking of algorithms are more trustworthy than absolute numbers.
- Everything is against spectral.js's model, not real paint.
- Timings are Node, single run, one machine. The browser runs the solver in a worker, so expect the same order of magnitude.
- The reference is a 120-pixel sample and not a strict floor.
- Only the Core six and Zorn palettes were run; no palette with custom tubes.

# Phase 2: fixes, with measured before and after

Each row is a measured before → after on the same nine pictures. "Before" is the naive baseline above; "after" is `npm run benchmark:plan` (default algorithm `library`). Every experiment below was run on Core six and Zorn.

## Step 1: choose piles from a recipe library (`library.ts`, `select.ts`, `plan.ts`)

Instead of clustering and asking the per-color solver, the plan builds a table of every whole-part recipe the palette can make (≤4 pigments, ≤16 parts, reduced ratios: 37,226 recipes for the Core six, built in about 130 ms and cached per palette), each with the swatch spectral.js predicts. It then picks piles by k-medoids over that table, judging candidates by ΔE00 of the predicted swatch, the metric users see. No randomness, no solver calls.

| piles | mean ΔE00 | visibly off (>5) | piles with no clean ratio | pictures that got worse with more piles | ms p50 / p95 |
|---|---|---|---|---|---|
| 5 | 6.46 → **5.42** | 52.8% → **38.2%** | 20.0% → **0%** | | 510 / 636 → **148 / 308** |
| 8 | 4.92 → **4.48** | 38.2% → **30.3%** | 29.2% → **0%** | 2 → **0** | 892 / 1063 → **157 / 305** |
| 12 | 4.55 → **4.08** | 32.5% → **25.9%** | 21.3% → **0%** | | 1200 / 1493 → **169 / 322** |

Zorn (four tubes): mean ΔE00 7.99 / 6.55 / 6.40 → **6.99 / 6.25 / 5.88**, visibly off 57.6 / 43.5 / 41.0% → **45.1 / 38.2 / 34.7%**, no piles without a clean ratio, runtime unchanged in kind (about 100 ms).

The gain at 8 and 12 piles (0.44 and 0.47 ΔE00) is more than twice the k-means seed noise measured above (0.18 on the mean over pictures). Runtime no longer depends on the budget: it is dominated by fitting, not by one solve per pile.

### What did NOT improve, or got worse

- **Tail error.** p95 ΔE00 (mean over pictures) is 14.05 / 10.38 / 8.99 against the baseline's 13.04 / 9.97 / 8.93: flat to slightly worse, and the worst picture's p95 at 5 piles is 25.3 against 19.1. The plan minimizes mean ΔE00, so it favors the bulk of the picture over small saturated accents.
- **Value error** is still higher than the baseline (2.25 vs 2.07 ΔL* at 12 piles, 2.68 vs 2.49 at 8), even with the value-weighted objective below, which cut it by 12% from where it would otherwise be.
- **Two pictures are worse than the baseline**, both pale-tint pictures: `landscape` 6.16 → 7.00 at 8 piles and `high-key` 2.01 → 2.62 (flat at 2.6 from 8 piles up). The naive solver reached sky blues and off-whites with percentage recipes that have no clean ratio; ≤16 whole parts cannot express a 1:60 tint of a strong pigment, so a library restricted to measurable recipes cannot reach them. This is the case a diluted, derived pile is for.
- **Parts per pile** with a clean ratio rose (10.3 / 9.5 / 9.0 against the baseline's 9.0 / 8.4 / 8.2 among its measurable piles). The totals in the summary are not comparable (the baseline counts unmeasurable piles as zero parts).
- **Fewer piles than asked** when the palette cannot tell more apart: `high-key` returns 8 piles for a 12-pile budget (only 234 distinct near-white swatches exist among its candidates, and no further one lowers the cost). The UI has to say "8 of 12 used".
- "Unreachable" (Poor-pile area) is essentially unchanged (20.8 / 17.1 / 17.2% against 25.2 / 19.0 / 17.1%): it is set by the palette, as expected.

### Experiments (Core six, 9 pictures; each row also run on Zorn)

The exchange rates are `alpha` (mean ΔE00 a plan may give up to save one part in a pile) and `beta` (to avoid one extra pigment). Both are in mean-ΔE00 units, so a sliver of the picture automatically gets a simpler recipe than a large pile.

| knob | values tried | result | chosen |
|---|---|---|---|
| parts price α | 0 / .002 / .005 / .01 / .02 | total parts at 12 piles 154 / 119 / 100 / 87 / 76 for mean ΔE00 3.95 / 3.97 / 4.03 / 4.11 / 4.26 | **0.005** (a third fewer parts for +0.08) |
| tube price β | 0 / .02 / .05 / .1 / .2 | distinct pigments at 8 piles 4.9 / 4.7 / 4.6 / 4.3 / 4.2 for mean ΔE00 +0 / .01 / .02 / .04 / .04 | **0.1** |
| lightness weight kL in the objective | 1 / .8 / .65 / .5 | value error at 8 piles 3.03 / 2.79 / 2.65 / 2.61; mean ΔE00 unchanged from 8 piles up, +0.10 at 5 piles for .65 | **0.65** |
| cost exponent γ | 1 / 1.3 / 1.6 / 2 | p95 at 8 piles 10.33 / 10.17 / 9.67 / 9.36, but 12–33% more parts at 12 piles (106 / 119 / 131 / 141), worse at 5 piles | rejected |
| stop when a pile adds <ε | 0 / .01 / .03 / .06 | no change up to .03; at .06 drops to 10.3 of 12 piles for +0.04 | 0 (fill the budget) |
| fit colors | 600 / 1200 / 2400 | ΔE00 within 0.03; runtime 422 / 563 / 1484 ms | **600** |
| candidates per fit color | 12 / 24 / 48 | ΔE00 within 0.04; runtime 424 / 563 / 751 ms | **12** |
| library depth | 12 / 16 / 24 parts | mean ΔE00 5.82 / 5.40 / 5.18 at 5 piles (4.98 / 4.44 / 4.29 at 8) | 16, the solver's limit (see below) |
| library width | ≤3 / ≤4 pigments | ≤3 pigments is +0.5 to +0.7 worse | 4 |

Two things stand out. First, the parts ceiling costs real accuracy: 24 parts would gain 0.23 ΔE00, mostly in tints. I kept the solver's limit of 16 because that is what the app already calls measurable, and will test dilution as the honest way to get finer tints. Second, the value-weighted objective is the right direction (the metric is still plain ΔE00 with kL = 1, so this cannot flatter the score), but it did not bring value error back down to the baseline's.

### Measurement changes made along the way

- `deltaE.ts`: an allocation-free CIEDE2000 kernel, 160 ns per call against 340 ns for culori's on prepared Lab values, tested equal to culori to 1e-7 (worst seen 2e-9, on a ΔE of 90 at near-opposite hues). `metrics.ts` now uses it. **Re-running the naive baseline through it changes no number (largest difference 2.5e-14)**, so the Phase 1 table above still stands.
- Library check against the per-color solver on the 64 curated colors of the accuracy audit: library ΔE00 mean 2.81 against 2.92, better by more than 0.5 on 32 of 64 and by more than 2 on 8. It is never worse than a solver recipe that had a clean ratio (asserted in `library.test.ts`); the 15 colors where it is worse are all ones where the solver fell back to unmeasurable percentages (pale blues and off-whites).

## Step 2: derived piles, "pile A plus N parts of X" (`derive.ts`)

A pile may be mixed from another pile instead of from scratch: k parts of a base pile plus d parts of one pigment (k and d up to 4, reduced). In the model the base counts as its pigments in the proportions of its recipe, so this is one pigment-level mix with those weights. Only one level deep: a base is always a scratch pile. This reaches tints finer than 16 parts allow (dilute a mid tint, in measurable steps) and needs fewer parts to measure. A base that no pixel uses directly is kept as a pile, because something is made from it.

Scratch-only library plan → with derived piles (Core six):

| piles | mean ΔE00 | visibly off | total parts | derived piles | ms p50 |
|---|---|---|---|---|---|
| 5 | 5.42 → **5.30** | 38.2% → **37.8%** | 51.3 → **45.4** (−11%) | 0 → 1.3 | 148 → 178 |
| 8 | 4.48 → **4.32** | 30.3% → **30.0%** | 76.1 → **61.9** (−19%) | 0 → 2.1 | 157 → 204 |
| 12 | 4.08 → **3.89** | 25.9% → **25.1%** | 106.6 → **78.9** (−26%) | 0 → 4.8 | 169 → 242 |

Zorn: mean ΔE00 6.99 / 6.25 / 5.88 → **6.93 / 6.17 / 5.76**, parts 48.6 / 71.2 / 99.9 → **43.3 / 56.4 / 72.3**. Total parts count each pile as the plan lists it (a derived pile: base parts plus extra parts; the base is counted once, as its own pile). The shared-base score (derived / piles) is 26% at 5 and 8 piles and 40% at 12.

The pale-tint pictures are where it pays:

| picture (mean ΔE00 @5 / 8 / 12) | naive baseline | scratch library | with derived piles |
|---|---|---|---|
| high-key | 2.65 / 2.01 / 1.97 | 2.63 / 2.62 / 2.61 | **2.09 / 2.10 / 1.95** |
| landscape | 7.37 / 6.16 / 5.57 | 8.31 / 7.00 / 6.72 | **7.78 / 6.30 / 5.98** |

Overall, naive baseline → final plan (Core six): mean ΔE00 6.46 / 4.92 / 4.55 → **5.30 / 4.32 / 3.89**, visibly off 52.8 / 38.2 / 32.5% → **37.8 / 30.0 / 25.1%**, no pile without a clean ratio (was 20–29%), p50 runtime 510 / 892 / 1200 ms → **178 / 204 / 242 ms**. Zorn: 7.99 / 6.55 / 6.40 → **6.93 / 6.17 / 5.76**.

What I measured and chose:

- **Ratio range.** Up to 4 + 4 parts gives 5.30 / 4.32 / 3.89 at 234 ms; 8 + 8 the same at 381 ms; 12 + 12 the same at 607 ms. Finer ratios do not help, so the plan uses 4 + 4.
- **Interaction with the parts price.** With derived piles, α = 0.0025 gives 5.18 / 4.26 / 3.82 at 48 / 67 / 94 parts, α = 0.01 gives 5.31 / 4.34 / 3.98 at 38 / 52 / 69. I kept α = 0.005: it lowers ΔE00 and parts together relative to scratch-only, which is the claim I can state without a caveat.
- **Monotonicity is no longer exact.** The derivation pass is greedy, so one picture gives back a hair: `high-key` 2.09 at 5 piles, 2.10 at 8. Scratch-only plans are exactly monotone (ratcheted at zero); derived plans are ratcheted at 0.05 ΔE00.
- **Runtime rose by about 30–80 ms** (the derivation pass evaluates each pile against every other pile's dilutions). Still 3–5× faster than the naive plan and independent of the budget.

Caveats specific to derived piles:

- **They lean on the model twice.** A derived pile treats a base as "its pigments in the proportions of its recipe", and the model's weights are spectral.js factors, not volumes (accuracy audit §5a). A recipe of "3 parts pile A + 1 part white" therefore inherits the same unvalidated assumption as any recipe, once more. The plan UI must show it as a prediction like the rest.
- **The base has to be mixed in enough quantity** for its own area plus what the derived piles take. The plan says which pile is the base but does not size batches.

## Performance

Whole-plan wall time in Node, Core six, nine pictures (p50 / p95, ms):

| piles | naive baseline (one solve per pile) | library, scratch piles | library with derived piles (final) |
|---|---|---|---|
| 5 | 510 / 636 | 148 / 308 | **178 / 339** |
| 8 | 892 / 1063 | 157 / 305 | **204 / 368** |
| 12 | 1200 / 1493 | 169 / 322 | **242 / 393** |

Zorn: 95 / 115, 159 / 177, 227 / 258 → **109 / 204, 121 / 218, 151 / 242**. The baseline scales with the budget (about 100 ms per solve); the library plan does not, because it makes no solver calls. The one-time cost of a palette's library is about 130 ms (37k recipes, Core six), cached per palette; the derived candidates for a base are built once and cached (66 mixes each). Where a 12-pile plan spends its 150 to 300 ms, for three pictures (ms): library search for candidates 21 to 67, exact ΔE00 cost matrix 20 to 138, selection 3 to 64, derivation pass 36 to 54, assigning the full picture 27 to 52, on 171 to 527 merged colors and 760 to 1700 candidates. The cost matrix went from 380 ns to 160 ns per ΔE00 evaluation with `deltaE.ts`. A cache by hex and options, as a solver-based plan would have needed, is moot now that no solver runs.

The browser will run this in a Web Worker (Phase 3). It needs no batching: the work is one pass, not one solve per pile. Timings there are not measured yet.

## Tried and not adopted: a structural value-first mode

Plan value steps first, then hue variants: choose 40–60% of the piles under a strongly value-weighted cost (CIEDE2000 kL 0.2–0.4), then fill the rest with the normal objective, with the value piles either frozen or refined afterwards. Measured against the default (Core six, 9 pictures):

| variant | mean ΔE00 @5 / 8 / 12 | value error @8 | p95 @8 |
|---|---|---|---|
| default (kL 0.65 throughout) | 5.30 / 4.32 / 3.89 | 2.65 | 10.22 |
| 50% at kL 0.3, frozen | 5.58 / 4.49 / 3.94 | 2.66 | 10.36 |
| 50% at kL 0.3, refined | 5.47 / 4.41 / 3.92 | 2.68 | 10.03 |
| 40% at kL 0.2, frozen | 5.47 / 4.50 / 3.98 | 2.61 | 11.03 |
| 60% at kL 0.4, refined | 5.38 / 4.36 / 3.88 | 2.63 | 10.23 |

No variant moves value error by more than 0.04 ΔL* while mean ΔE00 gets worse (up to +0.28 at 5 piles), so the plain value-weighted objective stays and the code was removed. The residual value gap to the naive plan (see below) is not a piling-order problem.

## What is still weak after Phase 2

1. **The library's resolution is the limit on some pictures, and that is not a selection problem.** Even with a pile for every color, the nearest library swatch is more than 5 ΔE00 away for 55% of `landscape` and 51% of `sunset`. Mean ΔE00 to the nearest library swatch (every fit color gets its own pile, area-weighted, 1500 merged colors) against the per-color solver's sampled reference:

   | picture | library, a pile per color | per-color solver reference | share of area >5 from every library swatch |
   |---|---|---|---|
   | fruit-saturated | 2.29 | 3.68 | 7% |
   | high-key | 2.48 | 2.77 | 2% |
   | interior-warm | 2.41 | 2.65 | 4% |
   | **landscape** | **5.45** | **4.51** | **55%** |
   | low-key | 3.01 | 4.39 | 6% |
   | portrait-deep | 2.04 | 2.94 | 2% |
   | portrait-light | 1.81 | 3.60 | 2% |
   | still-life-muted | 1.48 | 4.28 | 0% |
   | sunset | 7.08 | 7.71 | 51% |

   For eight of nine pictures the library reaches closer than the per-color solver, often by a lot. `landscape` is the exception: its yellow-greens (`#84A93D`: library 8.4, solver 5.4) and pale blues (`#B8D4EA`: 7.3 vs 3.9) need a touch of a strong pigment (a fraction of one part in 16), which the solver reached with percentage recipes that have no clean ratio. Derived piles recover part of it (7.00 → 6.30 at 8 piles); the 12-pile plan (5.98) is already close to the library's own floor (5.45), so more careful selection cannot close the rest. Allowing longer ratios would (24 parts gained 0.23 ΔE00 overall), at the price of piles a painter cannot measure. That is a product decision, not a tuning one.
2. **`sunset` (palette-limited) is unchanged**: 9.20 / 8.11 / 7.89 against a naive 10.49 / 8.94 / 8.45. Half its area is beyond the Core six's gamut with any recipe.
3. **The tail is not better.** p95 ΔE00 (mean over pictures) is 13.96 / 10.22 / 9.01 against the baseline's 13.04 / 9.97 / 8.93. The plan minimizes mean ΔE00; small saturated accents are the first thing it gives up. The cost exponent that protected them (γ) was measured and rejected because it inflated parts and hurt small budgets.
4. **Value error** is 3.62 / 2.65 / 2.17 ΔL* against the baseline's 3.34 / 2.49 / 2.07: about 5–8% higher, even with the value-weighted objective.
5. **`landscape` is still behind the naive plan at 5 and 12 piles** (7.78 vs 7.37, 5.98 vs 5.57), recorded as a ratchet so the gap can only close.
6. **Not tested: real photographs.** All of this is on nine generated pictures.

# Phase 3: the Plan view on `/`

Press **P** (or the Plan button beside Open and Value) with a picture open. The stage shows the picture repainted with only the plan's piles; the panel shows a pile budget (5 / 8 / 12), a headline with the numbers behind it, and each pile: swatch, recipe in whole parts, share of the picture, and the same fit label the Paint section uses. Click a pile to see where it goes (everything else fades); click a spot in the picture to find its pile; hold **B** or the "Hold for original" button to see the original; **Esc** lets go of a pile. Changing tubes under "Your paints" re-plans. The plan runs in a Web Worker (`plan.worker.ts`) on a copy of the picture at most 512 px on the long side, and nothing is uploaded.

## What the words are allowed to say

The headline is chosen from the share of the picture that is visibly off (more than ΔE 5 from its pile), the pixel-level number, not from pile labels, because pile labels understate the problem (audit item 5 above): under 10% "A close repaint", under 30% "A fair", under 60% "A rough", otherwise "A poor". Against the benchmark's 8-pile plans on the Core six that gives: close for `high-key` and `still-life-muted`, fair for four pictures, rough for `interior-warm`, poor for `landscape` and `sunset`. Under the headline are always the visible-miss share and the average miss; a second note appears when 5% or more sits in piles the palette can't mix (those piles read "Can't match", with the closest mix shown and the recipe dimmed), and a third when fewer piles than the budget are used. The model caveat (`MODEL_CAVEAT`), a note that derived piles lean on one more model assumption, and where the numbers were measured are on screen, not behind a link.

Hatching marks the visibly-off pixels (pixel level), not "unreachable" piles, so the picture shows the honest miss. A pile that is only a base for others is listed with "only used to mix Pile N" and no share.

## Checked in the browser (in-app Chromium, dev build)

| check | result |
|---|---|
| UI numbers against the benchmark, `landscape` on the Core six at 5 / 8 / 12 piles | ΔE 7.8 / 6.3 / 6.0, visibly off 83 / 72 / 63%, unmixable 52 / 59 / 55%, parts 40 / 70 / 92: **identical to the benchmark rows** |
| `portrait-light`, 8 piles | ΔE 3.6, 21% off, 3% unmixable, "A fair repaint": matches the benchmark (3.60) |
| custom palette (Core six plus a Quinacridone Magenta tube already saved in this browser) | plans with the extra tube (a periwinkle sky tint uses it); switching to "Back to the Core six" re-plans and changes the numbers |
| where the worker ran | the `plan.worker` chunk was fetched; the fallback path was not needed |
| 4000 × 3000 picture, warm | ready in **338 ms**, worst main-thread stall 10 ms |
| cold start (page load, spectral.js and the library built in the worker) | ready in **518 ms**, worst stall 12 ms |
| pile ↔ picture | clicking a pile fades the rest; clicking a spot selects its pile and scrolls the row into view; a deliberate second click lets go |
| before/after peek | held button and held **B** show the original, release restores the repaint |
| Value view inside Plan | shows the repaint in values (a check on whether the plan holds its value structure) |
| keyboard | **P**, hold **B**, **Esc**, arrow keys on the budget radios (a real `fieldset` of radio buttons), visible focus rings on radios and pile rows (computed `outline: 2px solid`) |
| phone width (375 × 812) | stacked layout, no horizontal scroll, pile detail fits, taps select piles |
| network during the whole session | every request went to `localhost`; the budget is the only thing persisted (`localStorage`) |
| production build (`npm run build`, static export) | succeeds; the plan worker chunk is emitted |
| console | no plan-related errors. One `Uncaught SyntaxError: Invalid or unexpected token` appears on every page load **with and without this work** (checked by stashing the change); none of the page's 28 scripts fails to parse, so it is most likely injected by the preview browser |

Not verified: real touch hardware, Safari or Firefox (only the in-app Chromium), a screen reader actually announcing results (the summary is a polite live region and the controls are real buttons, radios and a checkbox, but I did not listen to it), the Tauri desktop app (it opens the workbench, not `/`), and real photographs.

## Rough edges left in the UI

- On a poor plan the hatching covers most of the picture (63–83% for `landscape` and `sunset`, depending on the budget). That is the honest picture, but it is busy; the toggle turns it off.
- The loupe is hidden in Plan view, because it would magnify the original while you look at the repaint. A press-and-hold on touch selects piles as you drag.
- Opening another picture leaves Plan view. The repaint is drawn at the planning copy's resolution (at most 512 px) and smoothed when zoomed, so it is a coarse tool, not a pixel-level one.
- Total parts counts each listed pile once; the base of a derived pile is not sized for the batches that draw from it.
