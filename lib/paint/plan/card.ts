/**
 * The printable card as data: everything the page shows, decided here and tested here, so the
 * React view only lays it out. Built from the shared export model (export.ts) plus the plan's
 * pile map, which is what puts the pile numbers on the picture.
 *
 * Pure and deterministic. The date is passed in as text (a card made today and one made
 * tomorrow are the same card otherwise), and nothing is measured from the screen: the sizes
 * below are the card's own CSS pixels, and the badge radius handed to the label placement is
 * converted from them, so a badge is the same size on paper whatever the picture's shape.
 */
import type { PlanExport } from './export'
import { placeLabels } from './labels'
import type { PicturePlan } from './picture'

/**
 * Card geometry in CSS pixels.
 */
export const CARD = {
    /**
     * The room a page leaves inside 10 mm margins, for the smaller of Letter and A4 in each
     * direction: A4 is narrower (718 px), Letter is shorter (980 px). The card is laid out at
     * this width and, if it comes out taller than this height, zoomed down until it fits.
     */
    pageWidth: 718,
    pageHeight: 980,
    /** The largest either picture is drawn, inside its 1 px frame: two frames and a 16 px gap fill pageWidth */
    imageMaxWidth: 349,
    imageMaxHeight: 240,
    /** Pile-number badge radius; 8 px numbers about 9.5 px tall, which is legible on paper */
    badgeRadius: 8,
    badgeFont: 10,
} as const

export interface CardBadge {
    /** Pile number, 1-based */
    number: number
    /** Center, in pixels of the plan's pile map (an SVG viewBox of plan.width x plan.height) */
    x: number
    y: number
}

export interface CardCell {
    /** Pile number, 1-based */
    number: number
    name: string
    swatchHex: string
    /** The panel's fit label ("Approximate", "Can’t match"); null for a base no pixel uses */
    fitLabel: string | null
    cannotMatch: boolean
    /** "12%", "<1%", or "—" */
    share: string
    /** Whole parts: "5 parts Yellow Ochre, 1 Phthalo Green" or "3 parts Pile 3, 1 Titanium White" */
    recipe: string
    /** "6 parts to measure", plus "only used to mix Pile 2" for a base no pixel uses */
    partsLine: string
    /** Extra lines: the Can’t-match sentence, and the mix-order and quantity notes */
    notes: string[]
}

export interface CardModel {
    title: string
    /** "The Core six · 8 of 12 piles · September 28, 2026" */
    metaLine: string
    headline: string
    notes: string[]
    facts: PlanExport['facts']
    /** The original and the repaint are drawn at this size, in CSS pixels */
    image: { width: number; height: number }
    /** The pile map's size: the viewBox the badges are placed in */
    plan: { width: number; height: number }
    badges: CardBadge[]
    /** Badge radius and number size, in the pile map's pixels */
    badgeRadius: number
    badgeFont: number
    /** Piles that paint something but had no room for a number, by pile number */
    unlabeled: number[]
    unlabeledNote: string | null
    mixOrderLabel: string
    /** Pile numbers in mix order */
    mixOrder: number[]
    /** Written above a blank line: the painter's own unit, because parts are not volumes */
    partsLabel: string
    /** Pile cells in reading order: the first column top to bottom, then the second */
    columns: [CardCell[], CardCell[]]
    caveats: string[]
}

/** Said next to the Print card button. */
export const PRINT_NOTE = 'One page, Letter or A4, black and white safe. In the print dialog, Save as PDF keeps a copy.'

export const MIX_ORDER_LABEL = 'Mix in this order:'
export const PARTS_LABEL = 'One part ='

const listPiles = (numbers: number[]) => `Pile ${numbers.join(', ')}`

export function buildCard(plan: PicturePlan, model: PlanExport, options: { dateText: string }): CardModel {
    const aspect = plan.width / plan.height
    const width = Math.min(CARD.imageMaxWidth, CARD.imageMaxHeight * aspect)
    const image = { width: Math.round(width * 100) / 100, height: Math.round((width / aspect) * 100) / 100 }
    // pile-map pixels per card pixel
    const scale = plan.width / image.width

    const placed = placeLabels(plan.pile, plan.width, plan.height, plan.plan.piles.length, { radius: CARD.badgeRadius * scale })
    const badges = placed.labels.map((label) => ({ number: label.pile + 1, x: label.x + 0.5, y: label.y + 0.5 }))
    // a base no pixel uses owns nothing, so it is not "unlabeled": it was never on the picture
    const unlabeled = placed.unlabeled.map((pile) => pile + 1)

    const cells: CardCell[] = model.piles.map((pile) => ({
        number: pile.number,
        name: pile.name,
        swatchHex: pile.swatchHex,
        fitLabel: pile.fit?.label ?? null,
        cannotMatch: pile.cannotMatch,
        share: pile.share,
        recipe: pile.recipe,
        partsLine: `${pile.partsText} to measure${pile.onlyUsedToMix ? ` · ${pile.onlyUsedToMix}` : ''}`,
        notes: [...(pile.cannotMatch && pile.fit ? [pile.fit.detail] : []), ...pile.mixNotes],
    }))
    const split = Math.ceil(cells.length / 2)

    return {
        title: model.title,
        metaLine: [model.paletteLabel, model.pileCountLabel, options.dateText].join(' · '),
        headline: model.headline,
        notes: model.notes,
        facts: model.facts,
        image,
        plan: { width: plan.width, height: plan.height },
        badges,
        badgeRadius: CARD.badgeRadius * scale,
        badgeFont: CARD.badgeFont * scale,
        unlabeled,
        unlabeledNote: unlabeled.length > 0 ? `${listPiles(unlabeled)} ${unlabeled.length === 1 ? 'has' : 'have'} no room for a number on the picture.` : null,
        mixOrderLabel: MIX_ORDER_LABEL,
        mixOrder: model.mixOrder,
        partsLabel: PARTS_LABEL,
        columns: [cells.slice(0, split), cells.slice(split)],
        caveats: model.caveatLines,
    }
}
