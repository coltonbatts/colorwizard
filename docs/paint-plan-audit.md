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
