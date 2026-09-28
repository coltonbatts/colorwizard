import type { SpectralRecipe } from '../../spectral/types'

/**
 * Solves one target color. Callers close over the palette (see getPaletteSolveOptions)
 * so the plan code never resolves palettes itself. In the browser this is the solver
 * worker; in Node it is solveRecipe.
 */
export type PlanSolver = (hex: string) => Promise<SpectralRecipe>

/**
 * A pile mixed from another pile instead of from scratch: `baseParts` parts of the pile at
 * index `base` plus `extra` parts of single pigments. In the model, the base counts as its
 * pigments in the proportions of its recipe (so this inherits the same unvalidated
 * factor-versus-volume assumption as any recipe, once more).
 */
export interface PileDerivation {
    /** Index of the base pile in Plan.piles */
    base: number
    baseParts: number
    extra: Array<{ pigmentId: string; name: string; parts: number }>
}

export interface PlanPile {
    /** The color this pile stands for: the solved-for cluster center, or the average color of the pixels it serves */
    targetHex: string
    /**
     * How to mix it, and what the model predicts it looks like (recipe.predictedHex). For a
     * derived pile the ingredients are the flattened pigments, without whole parts; read
     * `derived` for the instructions.
     */
    recipe: SpectralRecipe
    /** Set when this pile is mixed from another pile (see PileDerivation) */
    derived?: PileDerivation
    /** Share of the picture's pixels this pile was fitted to (0..1). scorePlan recomputes usage from the swatches. */
    area: number
}

export interface Plan {
    /** How many piles the painter asked for */
    budget: number
    /** Ordered dark to light */
    piles: PlanPile[]
}
