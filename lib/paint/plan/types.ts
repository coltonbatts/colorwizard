import type { SpectralRecipe } from '../../spectral/types'

/**
 * Solves one target color. Callers close over the palette (see getPaletteSolveOptions)
 * so the plan code never resolves palettes itself. In the browser this is the solver
 * worker; in Node it is solveRecipe.
 */
export type PlanSolver = (hex: string) => Promise<SpectralRecipe>

export interface PlanPile {
    /** The color this pile was solved for (a cluster center) */
    targetHex: string
    /** How to mix it, and what the model predicts it looks like (recipe.predictedHex) */
    recipe: SpectralRecipe
    /** Share of the picture's pixels this pile was fitted to (0..1). scorePlan recomputes usage from the swatches. */
    area: number
}

export interface Plan {
    /** How many piles the painter asked for */
    budget: number
    /** Ordered dark to light */
    piles: PlanPile[]
}
