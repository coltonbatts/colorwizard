/**
 * Shared runner for the plan benchmark: scripts/paint-plan-benchmark.ts prints it and
 * plan/benchmark.test.ts holds the ratchets. Node only (reads the corpus).
 *
 * Scores are against spectral.js's forward model, like the per-color benchmark: they show
 * how well a plan's piles repaint a picture on screen, not that real paint would match.
 */
import { performance } from 'node:perf_hooks'
import { solveRecipe, type SolveOptions } from '../solveRecipe'
import { resolvePalettePigments } from '../palettePigments'
import { DEFAULT_PALETTE, type Palette } from '../../types/palette'
import type { Pigment, SpectralRecipe } from '../../spectral/types'
import { buildHistogram, type Histogram } from './histogram'
import type { CorpusImage } from './fixtures/corpus'
import { mean, quantile, scorePlan, type PlanScore } from './metrics'
import { naivePlan } from './naive'
import { makePlan, type PlanOptions } from './plan'
import { seededRandom } from './rng'
import { rgbToHex } from './color'
import type { Plan, PlanSolver } from './types'

/** What a planner is given besides the picture: how to solve a color, and the palette's tubes. */
export interface PlanContext {
    solve: PlanSolver
    pigments: Pigment[]
}

export type Planner = (hist: Histogram, budget: number, ctx: PlanContext) => Promise<Plan>

/** Every plan algorithm the benchmark knows, by name. The naive one never changes: it is the baseline. */
export const PLANNERS: Record<string, Planner> = {
    naive: (hist, budget, ctx) => naivePlan(hist, budget, ctx.solve),
    library: (hist, budget, ctx) => makePlan(hist, budget, ctx.pigments),
    /** The library planner with every pile mixed from scratch (no derived piles): what step 1 of Phase 2 measured. */
    'library-scratch': (hist, budget, ctx) => makePlan(hist, budget, ctx.pigments, { derive: false }),
}

/** A planner with explicit options, for experiments. */
export const libraryPlanner = (options: PlanOptions): Planner => (hist, budget, ctx) => makePlan(hist, budget, ctx.pigments, options)

const palette = (name: string, ids: string[]): Palette => ({
    id: name,
    name,
    colors: DEFAULT_PALETTE.colors.filter((c) => ids.includes(c.id)),
    isActive: false,
    isDefault: false,
    createdAt: 0,
})

/**
 * Palettes the benchmark runs. `core6` is the app default; `zorn` is the classic four-tube
 * limited palette. Each gives the solver options the naive baseline uses and the pigments
 * the library planner uses, both from the same palette.
 */
export const PALETTES: Record<string, { options: SolveOptions | undefined; pigments: Pigment[] }> = {
    core6: { options: undefined, pigments: resolvePalettePigments(DEFAULT_PALETTE.colors) },
    zorn: {
        options: { paletteColorIds: ['titanium-white', 'ivory-black', 'yellow-ochre', 'cadmium-red'] },
        pigments: resolvePalettePigments(palette('zorn', ['titanium-white', 'ivory-black', 'yellow-ochre', 'cadmium-red']).colors),
    },
}

export const contextFor = (name: string): PlanContext => ({
    solve: (hex) => solveRecipe(hex, PALETTES[name].options),
    pigments: PALETTES[name].pigments,
})

export interface PlanRow {
    image: string
    synthetic: boolean
    budget: number
    ms: number
    score: PlanScore
    /** Mean ΔE00 when pixels are given to piles by nearest solved-for target instead of nearest swatch */
    centerMeanDeltaE00: number
    /** How many piles carry each match label */
    labels: Record<SpectralRecipe['matchQuality'], number>
    plan: Plan
}

export async function runPlan(image: CorpusImage, budget: number, planner: Planner, ctx: PlanContext): Promise<PlanRow> {
    const hist = buildHistogram(image.data)
    const t0 = performance.now()
    const plan = await planner(hist, budget, ctx)
    const ms = performance.now() - t0
    const labels = { Excellent: 0, Good: 0, Fair: 0, Poor: 0 }
    for (const pile of plan.piles) labels[pile.recipe.matchQuality]++
    return {
        image: image.name,
        synthetic: image.synthetic,
        budget,
        ms,
        score: scorePlan(hist, plan),
        centerMeanDeltaE00: scorePlan(hist, plan, 'center').meanDeltaE00,
        labels,
        plan,
    }
}

export async function runBenchmark(images: CorpusImage[], budgets: number[], planner: Planner, ctx: PlanContext): Promise<PlanRow[]> {
    await planner(buildHistogram(images[0].data), 2, ctx) // warm-up: the first call loads spectral.js
    const rows: PlanRow[] = []
    for (const budget of budgets) for (const image of images) rows.push(await runPlan(image, budget, planner, ctx))
    return rows
}

export interface Summary {
    budget: number
    images: number
    /** Mean over images of each image's area-weighted mean ΔE00 (every picture counts equally) */
    meanDeltaE00: number
    /** Mean over images of each image's p95 ΔE00, and the worst single image */
    p95DeltaE00: number
    worstP95DeltaE00: number
    meanValueError: number
    unreachableArea: number
    worstUnreachableArea: number
    visiblyOffArea: number
    totalParts: number
    derivedPiles: number
    unpaintableShare: number
    distinctPigments: number
    minorPiles: number
    msP50: number
    msP95: number
}

export function summarize(rows: PlanRow[]): Summary {
    const pick = (f: (r: PlanRow) => number) => rows.map(f)
    return {
        budget: rows[0].budget,
        images: rows.length,
        meanDeltaE00: mean(pick((r) => r.score.meanDeltaE00)),
        p95DeltaE00: mean(pick((r) => r.score.p95DeltaE00)),
        worstP95DeltaE00: Math.max(...pick((r) => r.score.p95DeltaE00)),
        meanValueError: mean(pick((r) => r.score.meanValueError)),
        unreachableArea: mean(pick((r) => r.score.unreachableArea)),
        worstUnreachableArea: Math.max(...pick((r) => r.score.unreachableArea)),
        visiblyOffArea: mean(pick((r) => r.score.visiblyOffArea)),
        totalParts: mean(pick((r) => r.score.totalParts)),
        derivedPiles: mean(pick((r) => r.score.derivedPiles)),
        unpaintableShare: rows.reduce((s, r) => s + r.score.unpaintablePiles, 0) / rows.reduce((s, r) => s + r.score.pileCount, 0),
        distinctPigments: mean(pick((r) => r.score.distinctPigments)),
        minorPiles: mean(pick((r) => r.score.minorPiles)),
        msP50: quantile(pick((r) => r.ms), 0.5),
        msP95: quantile(pick((r) => r.ms), 0.95),
    }
}

export interface PerPixelReference {
    image: string
    samples: number
    /** Mean ΔE00 of the per-color solver's own recipe for each sampled pixel */
    meanDeltaE00: number
    /** Share of sampled pixels whose own recipe is still Poor (over 5 ΔE00) */
    unreachableShare: number
}

/**
 * A reference for what a pile budget could at best approach: solve area-weighted random
 * pixels of the picture one by one with the per-color solver (seeded, so an estimate).
 * NOT a strict floor: the solver minimizes OKLab distance and rounds to whole parts,
 * while a plan gives each pixel the nearest swatch in ΔE00, so a plan can beat it.
 */
export async function measurePerPixelReference(image: CorpusImage, solve: PlanSolver, samples = 120, seed = 7): Promise<PerPixelReference> {
    const rand = seededRandom(seed)
    const errors: number[] = []
    let poor = 0
    const pixelCount = image.width * image.height
    for (let i = 0; i < samples; i++) {
        const p = Math.floor(rand() * pixelCount) * 4
        const recipe = await solve(rgbToHex(image.data[p], image.data[p + 1], image.data[p + 2]))
        errors.push(recipe.error00 ?? 0)
        if (recipe.matchQuality === 'Poor') poor++
    }
    return { image: image.name, samples, meanDeltaE00: mean(errors), unreachableShare: poor / samples }
}

/**
 * Pictures whose mean ΔE00 got WORSE (by more than `tolerance`) when the pile budget went up. A
 * nearest-swatch repaint cannot get worse when piles are added, so each entry is an algorithm weakness.
 */
export function monotonicityViolations(rows: PlanRow[], tolerance = 0): Array<{ image: string; from: number; to: number; before: number; after: number }> {
    const out: Array<{ image: string; from: number; to: number; before: number; after: number }> = []
    const budgets = [...new Set(rows.map((r) => r.budget))].sort((a, b) => a - b)
    for (const image of new Set(rows.map((r) => r.image))) {
        for (let i = 1; i < budgets.length; i++) {
            const before = rows.find((r) => r.image === image && r.budget === budgets[i - 1])
            const after = rows.find((r) => r.image === image && r.budget === budgets[i])
            if (before && after && after.score.meanDeltaE00 > before.score.meanDeltaE00 + tolerance + 1e-9) {
                out.push({ image, from: budgets[i - 1], to: budgets[i], before: before.score.meanDeltaE00, after: after.score.meanDeltaE00 })
            }
        }
    }
    return out
}
