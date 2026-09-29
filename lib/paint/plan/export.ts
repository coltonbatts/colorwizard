/**
 * One description of a plan that every export shares: the Procreate palette and the printable
 * card are both built from this, so numbers, order, wording and caveats cannot drift apart.
 *
 * Pure and React-free. No dates, no randomness, no picture pixels: the same plan and options
 * give the identical model. Every number here is a model prediction (spectral.js, on a copy of
 * the picture); the caveats travel with the model because a printed page or a palette file is
 * where a reader can no longer hover or scroll to them.
 */
import type { PicturePlan } from './picture'
import {
    DERIVED_CAVEAT,
    describePiles,
    describePlan,
    describePlanFacts,
    MODEL_CAVEAT,
    PARTS_CAVEAT,
    PLAN_CAVEAT_COPY,
    PRINT_CAVEAT,
    pileCountLabel,
    type PileView,
    type PlanFact,
    type PlanVerdict,
} from './planFit'

export interface ExportOptions {
    /** As the plan wording reads it mid-sentence: "The Core six" or "Your palette" */
    paletteName: string
    /** What to call the palette on the card, when that is more useful than `paletteName` (a saved palette's own name) */
    paletteLabel?: string
    /** The picture's name, without extension, when known */
    pictureName?: string
}

export interface ExportPile extends Omit<PileView, 'fit' | 'share'> {
    /** 1-based, dark to light; the same number the panel, the card and the Procreate palette use */
    number: number
    /** What the model predicts the mix looks like on screen (recipe.predictedHex). Not measured paint. */
    swatchHex: string
    /** The average color of the part of the picture this pile paints (the swatch itself for a base no pixel uses) */
    targetHex: string
    /** Share of the picture, 0..1 */
    area: number
    /** "12%", "<1%", or "—" for a base that no pixel uses */
    share: string
    /**
     * How well the swatch matches the pile's target, in the panel's own wording. Null for a base
     * that no pixel uses: its target is its own swatch, so there is nothing to compare it with.
     */
    fit: PileView['fit'] | null
    /** True when the palette can't mix this pile (the panel's "Can't match") */
    cannotMatch: boolean
    /** Pile number this one is mixed from, or null for a pile mixed from scratch */
    derivedFrom: number | null
    /** Average ΔE00 across the pixels this pile paints; null when it paints none */
    meanMiss: number | null
    /** 1-based place in `mixOrder` */
    mixPosition: number
}

export interface PlanExport {
    /** The picture's name, or "Paint plan" */
    title: string
    pictureName: string | null
    /** Name for the palette line: `paletteLabel`, else `paletteName` */
    paletteLabel: string
    /** How many piles the plan uses, and how many the painter asked for */
    pileCount: number
    budget: number
    /** "8 piles", or "8 of 12 piles" when fewer are used than asked for; never padded */
    pileCountLabel: string
    verdict: PlanVerdict
    /** "A fair repaint": chosen from the pixel-level share visibly off, not from pile labels */
    headline: string
    /** Sentences under the headline, most important first */
    notes: string[]
    /** Average miss, visibly off, in piles it can't mix, to measure */
    facts: PlanFact[]
    /** Every pile once, in pile order (dark to light) */
    piles: ExportPile[]
    /**
     * Pile numbers in the order to mix them: a pile mixed from another comes after its base.
     * Otherwise dark to light, so a plan with no derived piles reads 1, 2, 3, ...
     */
    mixOrder: number[]
    /** Distinct tubes the plan uses, by name */
    tubes: string[]
    caveats: {
        model: string
        measured: string
        parts: string
        print: string
        /** Only when a pile is mixed from another */
        derived: string | null
    }
    /** The caveats above that apply, in the order a page should print them */
    caveatLines: string[]
}

/**
 * Bases before the piles made from them, otherwise lowest number first: repeatedly take the
 * lowest-numbered pile whose base is already taken. Bases are always scratch piles (one level
 * deep), so this always finishes; a malformed plan (a base out of range, or a loop) is finished
 * in number order rather than dropped, so every pile still appears exactly once.
 */
export function mixOrderOf(derivedFrom: Array<number | null>): number[] {
    const n = derivedFrom.length
    const done = new Array<boolean>(n).fill(false)
    const order: number[] = []
    for (let step = 0; step < n; step++) {
        let pick = -1
        for (let i = 0; i < n; i++) {
            const base = derivedFrom[i]
            if (done[i]) continue
            if (base === null || base === i || base < 1 || base > n || done[base - 1]) {
                pick = i
                break
            }
        }
        if (pick === -1) pick = done.indexOf(false)
        done[pick] = true
        order.push(pick + 1)
    }
    return order
}

export function describePlanForExport(plan: PicturePlan, options: ExportOptions): PlanExport {
    const { paletteName, pictureName } = options
    const budget = plan.plan.budget
    const summary = describePlan(plan, budget, paletteName)
    const views = describePiles(plan, paletteName)

    const derivedFrom = plan.plan.piles.map((pile) => (pile.derived ? pile.derived.base + 1 : null))
    const mixOrder = mixOrderOf(derivedFrom)

    const piles: ExportPile[] = plan.plan.piles.map((pile, index) => {
        const { fit, share, ...view } = views[index]
        const mean = plan.score.pileMeanDeltaE00[index]
        return {
            ...view,
            number: index + 1,
            swatchHex: pile.recipe.predictedHex,
            targetHex: pile.targetHex,
            area: plan.score.pileAreas[index],
            share: view.mixOnly ? '—' : share,
            fit: view.mixOnly ? null : fit,
            cannotMatch: !view.mixOnly && fit.verdict === 'cannot',
            derivedFrom: derivedFrom[index],
            meanMiss: view.mixOnly || Number.isNaN(mean) ? null : mean,
            mixPosition: mixOrder.indexOf(index + 1) + 1,
        }
    })

    const tubes = Array.from(new Set(plan.plan.piles.flatMap((pile) => pile.recipe.ingredients.map((i) => i.pigment.name)))).sort((a, b) => a.localeCompare(b))
    const derived = piles.some((pile) => pile.derivedFrom !== null) ? DERIVED_CAVEAT : null
    const caveats = { model: MODEL_CAVEAT, measured: PLAN_CAVEAT_COPY, parts: PARTS_CAVEAT, print: PRINT_CAVEAT, derived }

    return {
        title: pictureName?.trim() || 'Paint plan',
        pictureName: pictureName?.trim() || null,
        paletteLabel: options.paletteLabel ?? paletteName,
        pileCount: piles.length,
        budget,
        pileCountLabel: pileCountLabel(piles.length, budget),
        verdict: summary.verdict,
        headline: summary.headline,
        notes: summary.notes,
        facts: describePlanFacts(plan),
        piles,
        mixOrder,
        tubes,
        caveats,
        caveatLines: [caveats.model, ...(derived ? [derived] : []), caveats.parts, caveats.measured, caveats.print],
    }
}
