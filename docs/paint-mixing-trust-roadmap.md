# Paint Mixing Trust Roadmap

## Current Truth

ColorWizard is directionally useful for painters, but it is not a measured paint simulation.

- The main recipe solver lives in `lib/paint/solveRecipe.ts` and searches pigment combinations with `spectral.js`.
- The spectral adapter in `lib/spectral/adapter.ts` creates spectral colors from paint `hex` values plus `tintingStrength`.
- The paint catalog in `data/paints/winsor-newton/winton.json` contains useful behavior fields like `tintingStrength` and `coveringPower`, but it does not currently provide measured `spectralReflectance` or `kmCoefficients`.
- The heuristic fallback in `lib/colorMixer.ts` is rule-based from HSL, not solver-backed.
- The general mix engine in `lib/paint/mixEngine.ts` has a true RGB-average fallback, but that is not the main recipe solver path.

What the system is genuinely strong at:

- Limited-palette recipe search from a constrained set of paints.
- Relative tinting-strength behavior for strong colors like phthalos.
- Fast on-screen comparisons using OKLab deltaE.
- Producing usable starting mixes and sensible value-first steps.

What is still approximate:

- Paint spectral behavior is inferred from display hex plus tinting strength.
- Solver error is an on-screen fit metric, not a statement about real dried paint.
- Catalog fields like `coveringPower`, `opacity`, and `oilAbsorption` are mostly stored but not yet influencing the solver.
- Heuristic fallback is practical guidance, not a validated prediction.

## Trust Fixes Shipped Now

- Live fallback recipes no longer fabricate a predicted swatch, deltaE, or match-quality badge.
- Live recipe UI now separates `Solver Preview` from `Heuristic Guide`.
- Solver-backed copy now explicitly says the preview is driven by paint swatches and tinting strength, not measured reflectance.
- Saved/exported color cards now store solver ingredients and solver steps when a solver result exists, instead of mixing heuristic ingredients with solver confidence metadata.
- Card exports now label solver quality as `screen fit`, which is narrower and more honest than `match`.
- Public-facing metadata and dropzone copy no longer say `real oil paint recipe`.
- Catalog paint IDs now survive the solver result mapping path, reducing accidental fallback to heuristic mode for library recipes.

## Tier 2 Roadmap

Tier 2 should improve input fidelity first. Do not start with more optimizer complexity.

### 1. Build a small trusted core palette

- Choose 8-12 paints that matter most in real use: titanium white, ivory black, yellow ochre, burnt umber, raw umber, cad red hue, ultramarine or phthalo blue, phthalo green, burnt sienna, raw sienna.
- For each paint, add a short `mix profile` grounded in painter behavior: warm/cool bias, transparency tendency, covering power, tinting strength, staining tendency, white response.
- Keep the library small enough that every paint can be reviewed manually.

### 2. Upgrade spectral proxies instead of jumping to measured lab data

- Replace plain hex-derived spectral inputs with hand-tuned proxy curves per core paint family.
- Start with a few paint families where hex is especially misleading: phthalos, earths, titanium white, ivory black.
- Keep proxy generation explicit and versioned. Each paint should say whether it uses `hex proxy` or `tuned spectral proxy`.

### 3. Use stored paint properties where they actually matter

- `coveringPower`: use as a restraint on how aggressively transparent colors can dominate opaque mixtures.
- `opacity`: use as a categorical prior, not as hard physics.
- `oilAbsorption`: use later for glazing or film-behavior notes, not first-pass recipe search.
- `tintingStrength`: keep using it, but calibrate it against observed painter mixes instead of treating it as a one-time guess.

### 4. Validate against painter-observed mixes

- Define expected behavior in painter language first: `too chalky`, `too dead`, `undertone flips green`, `phthalo takes over too early`.
- Compare solver output against a compact truth set of observed mixes before expanding solver features.
- Track failures by category, not just average deltaE.

### 5. Add explicit provenance to paint data

- Add a field like `mixModel: hex-proxy | tuned-proxy | measured`.
- Surface that provenance in debugging and future admin tools.
- Keep user-facing language simple: `guide`, `solver preview`, `library-based`.

## Compact Validation Framework

Judge success by painter believability first, screen error second.

### Categories

- Subtle neutrals: should hold temperature and avoid collapsing to flat gray.
- Chromatic darks: should prefer mixed darks over defaulting to black-heavy mud.
- Muted complements: should stay alive, not jump straight to dead brown.
- White-heavy tints: should lighten without instantly going chalky or pastel-flat.
- Phthalo-heavy mixes: should show strong tinting strength and easy overshoot.
- Earthy mixtures: should preserve warm/cool earth character instead of generic brown.
- Undertone-sensitive mixes: should respect blue-vs-green and red-vs-violet bias shifts.

### Truth Set

| Case | Category | Target | Good behavior | Failure mode |
| --- | --- | --- | --- | --- |
| 1 | Subtle neutral | Warm gray linen | Slight warm bias, restrained chroma, minimal black | Flat neutral gray with no temperature |
| 2 | Subtle neutral | Cool stone gray | Blue or umber undertone stays visible | Dirty brown or dead black-gray |
| 3 | Subtle neutral | Skin-shadow neutral | Warm-muted mix, not pink candy | Too red, too white, or ashy |
| 4 | Chromatic dark | Deep bottle green | Green-black built from color, not only ivory black | Generic black with weak hue |
| 5 | Chromatic dark | Dark navy shadow | Blue-dark with depth | Pure black plus white correction |
| 6 | Chromatic dark | Maroon dark | Red-brown dark with body | Brown mud or black-heavy collapse |
| 7 | Muted complement | Olive from yellow + blue bias | Earthy green with believable dullness | Neon green or dead sludge |
| 8 | Muted complement | Dusty violet gray | Violet survives neutralization | Instant brown |
| 9 | White-heavy tint | Sky blue tint | White-led mix with blue staying clean | Chalky cyan or gray pastel |
| 10 | White-heavy tint | Blush pink | Controlled white with red bias | Bubblegum pink or flat white |
| 11 | Phthalo-heavy | Phthalo blue tint | Tiny phthalo dose has strong effect | Needs unrealistically large blue ratio |
| 12 | Phthalo-heavy | Saturated teal | Green-blue turns fast and stays staining-looking | Weak, muddy middle cyan |
| 13 | Earthy mixture | Raw umber neutral | Lean, cool earth dark | Generic brown |
| 14 | Earthy mixture | Burnt sienna orange-brown | Warm transparent-feeling earth | Heavy opaque orange |
| 15 | Undertone-sensitive | Blue-black mix | Reads cooler than ivory black alone | Loses blue bias immediately |
| 16 | Undertone-sensitive | Warm cream tint | White plus ochre warmth, not banana yellow | Over-yellowed highlight |

### How To Judge Each Case

- First pass: painter eyeball review against category notes.
- Second pass: compare ingredient order and dominant pigment against expectation.
- Third pass: check on-screen deltaE only after the mix feels plausible.
- Mark each case as `believable`, `usable with caution`, or `misleading`.

## Recommended Product Language

Prefer:

- `Oil paint mixing guide`
- `Solver preview`
- `Heuristic guide`
- `Screen fit`
- `Built from the selected palette`
- `On-screen estimate`

Avoid:

- `Real paint recipe`
- `Physically accurate`
- `True match`
- `Exact paint simulation`
- `Physical mode` in product UI until measured data exists

## What Should Wait

- Full measured-reflectance capture for an entire paint library.
- New optimizer work unless validation shows search quality is the bottleneck.
- Film-thickness, glaze-layer, or drying-model simulation.
- Any marketing copy that promises exact real-world paint behavior.
