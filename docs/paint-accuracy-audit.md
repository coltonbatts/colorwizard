# Paint accuracy audit

Measured 2026-09-28 at commit `8366819e` (plus the benchmark harness). Reproduce with:

```bash
npm run benchmark:paint            # full report, ~10 min (brute-force baseline dominates)
npm run benchmark:paint -- --quick # ~1 min
npx vitest run lib/paint/benchmark # fast regression ratchets
```

## Phase 2 results (fixes applied)

Every row is a measured before → after on the same target sets. "Before" is the audit above; "after" is `npm run benchmark:paint` at the final Phase 2 commit. Details are in each commit message.

| finding | measure | before | after | commit |
|---|---|---|---|---|
| 3-pigment cap | gap to brute-force ≤4-pigment optimum, unrounded (n=136): p95 / max / >2 | 2.07 / 3.92 / 5.1% | 0.88 / 1.17 / 0% | Let the solver use a 4th pigment |
| escalation gate | known 3-pigment recipes left >0.5 on the table | 39.1% | 0% (max 1.38 → 0.38 unrounded) | same |
| skin tones | ΔE-OK p50 / max | 1.59 / 3.92 | 0.47 / 2.38 (unrounded) | same |
| paintability | curated colors without a clean ≤16-part recipe | 40.6% (at ≤12 parts) | 23.4% | Return recipes in whole parts |
| paintability | all targets unpaintable / ingredient <2% | 24.7% / 5.3% | 13.2% / 1.3% | same |
| labels | ΔE00 reached by "Excellent" / "Good" / "Fair" (max) | 4.39 / 7.73 / 16.45 | 1.00 / 2.48 / 4.86 | Label match quality by CIEDE2000 |
| heuristic bug | recipes with an unmapped amount | 22.1% | 0% | Give 'generous' a weight |
| custom palette | (feature, not a benchmark move) | fixed Core 6 or library ids | user tubes with hex and strength | Let users solve with their own tubes |

What it costs, so the numbers above are not read as free:

- **Printed-recipe error rose by the rounding budget.** `recipe.error` is now the whole-part recipe as printed. Curated ΔE-OK p50 is 1.11 (0.48 unrounded), p95 3.54, max 5.31 unchanged. Rounding may add up to 1 ΔE-OK over `unroundedError`, which is still returned. Against the brute-force optimum the *printed* recipe is p50 0.54 / p95 1.50 / max 1.81 worse, by design.
- **Honest labels read worse.** 12 of 64 curated colors (foliage 5/14, sky 3/12, skin 3/20) now label Poor: the predicted swatch is over 5 ΔE00 from the target. The OKLab bands said 0 of 64.
- **Slower.** Node p50 57 → 97 ms, p95 59 → 178 ms per solve (worker in the browser).
- **Still 13% unpaintable, and curated recipes still need a median of 11–12 parts.** Skin and sky colors need long ratios for sub-1 ΔE; fewer parts costs accuracy (measured: ≤8 parts is paintable for 28% of curated colors, ≤12 for 53%, ≤16 for 75%, at a 1 ΔE budget).
- **Not fixed:** the tinting-strength constants and the "weights are factors, not volumes" question (§5). They need physical swatches.

## What this can and cannot prove

**Everything below scores a recipe against spectral.js's own forward model.** The repo has no measured paint swatches, so this audit measures search quality, internal consistency and paintability. It does **not** show that a recipe reproduces the color when mixed from real tubes. Section 5 shows why that gap is the largest open risk.

Units: **ΔE-OK** is OKLab Euclidean distance ×100, which is what the solver optimizes and reports as `recipe.error`. **ΔE00** is CIEDE2000 between `predictedHex` and the target hex.

Target sets (`lib/paint/benchmark/targets.ts`):

| set | n | what it is |
|---|---|---|
| skin, sky, foliage, earth, neutral | 64 | Hand-picked representative colors. **Not sampled from a photo corpus.** |
| sweep | 216 | 6×6×6 sRGB grid. Most of it is outside any oil palette's gamut, by design. |
| known | 100 | Random 2–3 pigment whole-part recipes mixed *forward* (seed 1). The right answer is known. |

## Summary: what is actually wrong

Ranked by measured impact:

1. **The 3-pigment cap costs real accuracy on skin and earth tones.** The solver never returns more than 3 pigments. A 4-pigment mix (white + black + ochre + red) reaches ΔE-OK ≈ 0 on targets where the best 3-pigment mix is at 2–4. Best 3-pigment minus best 4-pigment is >1 on 11.0% of the baseline sample and up to 3.92 (§4).
2. **Recipes are not paintable.** On the 64 curated colors, **40.6%** have no recipe of ≤12 whole parts within +1 ΔE-OK of the solver's answer. Median recipe needs 9 parts. The best 12-part rounding costs a median 0.85 and a p95 of 7.3 ΔE-OK (§3). The UI prints whole percents such as "63% / 29% / 9%", which nobody can measure by hand.
3. **The match labels are too generous.** "Excellent" is `error < 1` in OKLab, but 142 "Excellent" results reach **ΔE00 4.39** (p95 2.61). "Good" reaches 7.73. On the curated colors ΔE00 is p50 2.71, p95 7.67, and only 25% of skin tones (5/20) earn "Excellent" (§1, §2).
4. **The 3-pigment escalation gate skips searches it needs.** The 3-pigment grid only runs when the best 2-pigment error is >1.5. Of 46 known 3-pigment recipes, the gate skipped the 3-pigment stage on **84.8%**, and the solver left >0.5 ΔE-OK on the table on 39.1% (max 1.38, where the truth scores ≈0.2). Overall 31.8% of solves skip it; 13.2% of those end above 1.0 (§1).
5. **Tinting-strength constants are unvalidated, and they decide the recipe.** Halving or doubling any one of them changes that pigment's weight by a median 3–17 points and changes the pigment set on 5–28% of recipes, while the solver's own error is unchanged (Δ p50 = 0.00). ΔE cannot detect a wrong constant (§5).
6. **The heuristic engine (`colorMixer.ts`) is inaccurate and has a bug.** Median ΔE-OK 24.1, 92.9% Poor when scored through the spectral model. `'generous'` is emitted by the engine in 5 places, but `HEURISTIC_WEIGHT_MAP` has no entry, so it weighs 0. This hits 58% of sky recipes and 22% overall (§3b).
7. **Minor:** adapter cache is unbounded (§6), `refineCandidateSync` is dead code, and a solve takes 57 ms in Node when the 3-pigment search runs.

What is fine: search quality inside 3 pigments (solver − best 3-pigment: p50 0.00, p95 0.37, only 2.2% >0.5). The cache is correct and deterministic. Rounding to whole percent adds a median 0.00 and a p95 of 0.22 ΔE-OK, so it is not the problem. The problem is that percents are not paintable at all.

## 1. Solver accuracy (`lib/paint/solveRecipe.ts`, Core 6, default options)

| set | n | ΔE-OK p50 | p95 | max | ΔE00 p50 | p95 | Poor (≥6) | 3-pig tried | ms p50 | ms p95 |
|---|---|---|---|---|---|---|---|---|---|---|
| skin | 20 | 1.59 | 3.82 | 3.92 | 4.15 | 7.54 | 0% | 100% | 57.7 | 60.1 |
| sky | 12 | 1.04 | 3.17 | 3.50 | 3.60 | 7.19 | 0% | 75% | 56.3 | 72.2 |
| foliage | 14 | 1.30 | 5.29 | 5.31 | 2.72 | 7.39 | 0% | 78.6% | 56.4 | 57.3 |
| earth | 10 | 0.79 | 2.98 | 3.79 | 2.14 | 9.03 | 0% | 90% | 56.3 | 57.1 |
| neutral | 8 | 0.31 | 0.80 | 0.91 | 0.72 | 3.29 | 0% | 25% | 1.6 | 56.5 |
| sweep | 216 | 8.34 | 22.11 | 28.67 | 12.35 | 28.59 | **63.0%** | 93.1% | 56.9 | 58.3 |
| known | 100 | 0.18 | 1.04 | 1.38 | 0.39 | 3.49 | 0% | 7% | 1.5 | 56.3 |

- **Out-of-gamut rate:** 63.0% of the sweep is "Poor". This is mostly real: on the baseline sample, 30.9% (42/136) of targets can't be reached within ΔE-OK 6 by *any* ≤4-pigment Core 6 mix.
- **Escalation:** 68.2% of all solves tried the 3-pigment grid, 50.5% used it. Runtime is bimodal: ~1.5 ms without it, ~57 ms with it (max 91 ms, Node, single thread; the browser runs it in a worker).
- **Recovery of known recipes:** the exact pigment set came back on 56% of known recipes (metamerism: different pigment sets can match), with weights within a median 0.7 points when it did. For the 46 known 3-pigment recipes: p50 0.42, p95 1.32, max 1.38, versus about 0.2 for the truth (hex rounding alone).
- **Solves that skipped the 3-pigment search:** 31.8% of all solves. Of those, 29.8% ended >0.5 and 13.2% ended >1.0.
- 15 targets have OKLab error <0.5 but predicted-hex ΔE00 >1. They are mostly dark, mid-tone or low-chroma colors, where OKLab distance understates ΔE00 (worst is #8C7B6B: OK 0.42, ΔE00 1.75).

## 2. What the match labels mean in ΔE00

| label (`getMatchQuality`, OK thresholds) | n | ΔE00 p50 | p95 | max |
|---|---|---|---|---|
| Excellent (<1) | 142 | 0.51 | 2.61 | 4.39 |
| Good (<2.5) | 48 | 3.24 | 6.66 | 7.73 |
| Fair (<6) | 54 | 7.17 | 13.24 | 16.45 |
| Poor | 136 | 17.43 | 29.98 | 33.97 |

The thread side of the same app uses ΔE00 <1 / <2.5 / <5. Paint labels are not comparable to those: a paint "Very close" can be ΔE00 4.4, which the thread UI would call "Close".

## 3. Paintability

Thresholds: an ingredient under 2% can't be measured by hand; no whole-part recipe of ≤12 parts within +1 ΔE-OK of the solver's own answer is treated as not paintable.

| set | ingredient <2% | no ≤12-part recipe within +1 | unpaintable (either) | median parts | p95 parts | printed whole-% adds ΔE p50 / p95 / max |
|---|---|---|---|---|---|---|
| skin | 10% | 35% | 35% | 8 | 12 | 0.02 / 0.33 / 0.44 |
| sky | 16.7% | 58.3% | 58.3% | 7 | 12 | 0.07 / 0.41 / 0.43 |
| foliage | 14.3% | 50% | 50% | 11 | 12 | 0.02 / 0.20 / 0.33 |
| earth | 0% | 30% | 30% | 10 | 12 | 0.02 / 0.22 / 0.22 |
| neutral | 0% | 25% | 25% | 6 | 11 | 0.00 / 0.34 / 0.47 |
| sweep | 6% | 26.9% | 30.6% | 6 | 12 | 0.01 / 0.17 / 0.67 |
| known | 1% | 1% | 2% | 3 | 9 | 0.00 / 0.04 / 0.28 |

Curated 64 combined: **40.6% unpaintable**, median 9 parts. When no ≤12-part recipe fits, the best 12-part rounding costs a median 0.85 and a p95 of 7.3 ΔE-OK.

Contributing cause: the solver's Nelder–Mead stage stops at the first weight vector under ΔE-OK 0.5 and has no preference for ratios a person can measure.

### 3b. Heuristic engine (`lib/colorMixer.ts`), scored through the same forward model

| set | n | ΔE-OK p50 | p95 | max | ΔE00 p50 | Poor | uses unmapped amount |
|---|---|---|---|---|---|---|---|
| skin | 20 | 16.04 | 35.04 | 41.61 | 19.20 | 100% | 0% |
| sky | 12 | 26.20 | 59.49 | 62.96 | 27.78 | 100% | 58.3% |
| foliage | 14 | 10.58 | 21.26 | 25.34 | 17.62 | 78.6% | 0% |
| earth | 10 | 14.90 | 34.02 | 36.45 | 19.95 | 100% | 0% |
| neutral | 8 | 10.69 | 20.71 | 21.94 | 15.66 | 62.5% | 0% |
| sweep | 216 | 28.99 | 57.38 | 67.26 | 29.09 | 93.5% | 25.5% |

The spectral solver beats it by >0.5 ΔE-OK on 98.2% of curated+sweep targets. The heuristic engine is qualitative ("mostly / small amount"), so it is scored here by mapping its labels through `HEURISTIC_WEIGHT_MAP`. That is the same mapping the app uses for its own steps, and it maps `'generous'` to nothing. `/` (the simple web version) uses only the spectral solver, so this affects `components/PaintRecipe.tsx` and saved cards (`lib/colorCardStorage.ts`).

## 4. Does the grid search find the true optimum?

Baseline: independent exhaustive search over every subset of up to 4 of the Core 6 (1% grid for 1–3 pigments, 2% for 4) followed by a compass-search polish, directly against spectral.js. It is never worse than the solver (asserted in the test suite). Sample: all 64 curated colors + every third sweep color, n = 136.

| n | baseline p50 | solver p50 | gap p50 | p95 | max | >0.5 | >1 | >2 |
|---|---|---|---|---|---|---|---|---|
| 136 | 2.39 | 2.97 | 0.00 | 2.07 | 3.92 | 19.1% | 13.2% | 5.1% |

Splitting the gap into its two causes:

| measure | p50 | p95 | max | >0.5 | >1 | >2 |
|---|---|---|---|---|---|---|
| solver − best possible 3-pigment mix (**search quality**) | 0.00 | 0.37 | 1.27 | 2.2% | 1.5% | 0.0% |
| best 3-pigment − best 4-pigment (**cost of the 3-pigment cap**) | 0.00 | 2.07 | 3.92 | 16.2% | 11.0% | 5.1% |

So the search is good; the cap is the limit. The worst gaps are all skin and earth colors whose best recipe is white + black + ochre + red, for example #C68E62 (solver 3.92, four-pigment optimum 0.00) and #C08860 (3.82 vs 0.00).

## 5. Tinting strength and what "weight" means

Two findings about the forward model:

**a) Weights are spectral.js "factors", not volume fractions.** spectral.js computes each pigment's concentration as `factor² · tintingStrength² · luminance` (`node_modules/spectral.js/spectral.js:381`). The solver's weights are those factors. Whether a real 3:1 measured volume mix behaves like the model's 3:1 factor mix is unverified. Parts rounding therefore works in the model's own units, which is at least consistent with what the solver optimizes, but the on-screen prediction is what "3 parts white, 1 part ochre" is being checked against, not a physical mix.

**b) The constants were hand-set and the ΔE metric can't see them.**

| pigment | hex | tintingStrength | luminance Y | potency = ts²·Y | share that darkens white by 20 OKLab L points |
|---|---|---|---|---|---|
| titanium-white | #FDFDFD | 1 | 0.982 | 0.98 | n/a |
| ivory-black | #0B0B0B | 5 | 0.0033 | 0.08 | 12.3% |
| yellow-ochre | #CC8E35 | 0.9 | 0.324 | 0.26 | 57.9% |
| cadmium-red | #E52B21 | 1.5 | 0.185 | 0.42 | 25.9% |
| phthalo-green | #123524 | 8 | 0.028 | 1.79 | 7.5% |
| phthalo-blue | #0F2E53 | 10 | 0.027 | 2.68 | 6.1% |
| raw-umber (not in Core 6) | #735C44 | 1.2 | 0.117 | 0.17 | 40.5% |

Sensitivity (each constant ×0.5 or ×2 on its own, 64 curated targets):

| pigment | ×0.5: its weight shifts p50/p95 (pts) | ×0.5: pigment set changes | ×2: weight shifts p50/p95 | ×2: pigment set changes | solver error Δ p50 |
|---|---|---|---|---|---|
| titanium-white | 14.2 / 18.2 | 28.1% | 15.3 / 17.6 | 10.9% | 0.00 |
| ivory-black | 11.3 / 17.3 | 7.8% | 9.9 / 16.6 | 23.4% | 0.00 |
| yellow-ochre | 14.3 / 24.7 | 18.8% | 16.5 / 29.6 | 17.2% | 0.00 |
| cadmium-red | 14.8 / 27.6 | 20.3% | 11.2 / 22.3 | 25.0% | 0.00 |
| phthalo-blue | 4.7 / 13.9 | 4.7% | 2.9 / 7.8 | 14.1% | 0.00 |
| phthalo-green | 6.0 / 16.4 | 14.1% | 3.8 / 13.4 | 7.8% | 0.00 |

Whatever the constants are, the solver reaches the same on-screen match by rebalancing the recipe. **A self-consistent benchmark is blind to them, so the only way to validate them is physical.** Data needed: mix white + each tube at a few fixed volume ratios (e.g. 1:19, 1:9, 1:4), photograph under known light, and fit. I could not do this and have not guessed values.

Spot checks of the model for comparison against real tubes (white + pigment, weight shares): 2% black → #F4F4F3, 5% → #E3E3E3, 10% → #C8C8C8; 2% phthalo blue → #D5EBF4, 5% → #A1CEE4.

Type/docs mismatch: `Pigment.tintingStrength` is documented "(0-1)" in `lib/spectral/types.ts`; values in `palette.ts` range 0.9–10.

## 6. Adapter cache (`lib/spectral/adapter.ts`)

- **Correct.** The key `hex-tintingStrength` separates the same hex at different strengths. Solving A, B, A gives identical output. No shared-object mutation was found: each (hex, strength) gets its own Color.
- **Unbounded.** Nothing evicts. Every distinct sampled hex (targets, via `createColor`) adds an entry for the life of the page or worker. Hex case differences (`#fdfdfd` vs `#FDFDFD`) create duplicate entries. Low severity: each entry is on the order of a kilobyte, so dragging over a photo grows it slowly.
- `refineCandidateSync` (grid refinement) is dead code, superseded by Nelder–Mead.

## Contradictions with CLAUDE.md, and proposed fix

| CLAUDE.md says | Actual |
|---|---|
| "Grid search: coarse 2% steps → fine 0.5% refinement around best candidate" | Coarse 2% grid, then **Nelder–Mead** (`nelderMead.ts`, stops at ΔE-OK ≤0.5). The 0.5% grid refiner exists but is never called. |
| "Phthalos have tinting strength 2.0; others 1.0" | white 1.0, black 5.0, ochre 0.9, cad red 1.5, phthalo green 8.0, phthalo blue 10.0 (raw umber 1.2). |
| "the same 6-color limited palette defined in `lib/spectral/palette.ts`" | `palette.ts` defines 7 (adds Raw Umber). The solver filters to 6 by default via `CORE_SIX_PIGMENT_IDS`. `colorMixer.ts` hard-codes 6 names. |
| "Escalates to 3-pigment if 2-pigment error > 1.5 deltaE (OKLab)" | True, but the unit is OKLab ×100, and this gate is itself a measured problem (§1). |
| (not mentioned) | A third path exists: `useCatalog: true` uses the Winsor & Newton catalog (`lib/paint/catalog.ts`) and `usePaintPaletteStore`, separate from `usePaletteStore`. |

Proposed `CLAUDE.md` replacement for the spectral bullet list, to be applied with the fixes so it stays true:

> **Spectral** (`lib/paint/solveRecipe.ts`): physics-based via spectral.js. Coarse 2% grid over 2-pigment mixes, escalating to 3 pigments, then Nelder–Mead refinement. Weights are spectral.js "factors" (concentration ∝ (weight·tintingStrength)²·luminance), not volume fractions. Tinting strengths in `lib/spectral/palette.ts` are hand-set and unvalidated. `npm run benchmark:paint` measures accuracy; `lib/paint/benchmark/benchmark.test.ts` holds the ratchets.

## Limits of this audit

- Curated targets are hand-picked, not photo-sampled; treat per-set numbers as indicative.
- Node timings, single run, one machine (Node 22).
- The baseline covers ≤4 pigments and the Core 6. 5–6 pigment mixes can only do better.
- Nothing here checks physical paint.
