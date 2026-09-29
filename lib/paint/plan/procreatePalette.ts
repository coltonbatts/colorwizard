/**
 * The plan as a Procreate palette: one swatch per pile, dark to light, so swatch N is Pile N.
 *
 * Swatches are the piles' PREDICTED colors (recipe.predictedHex): what the repaint on screen
 * shows, and what the piles are supposed to mix to in the model. They are not the average
 * colors of the picture's regions (those are colors the piles cannot mix), and they are not
 * measured paint.
 *
 * The .swatches format has a name for the palette and nothing per swatch, so recipes cannot
 * ride along: the pile number is the swatch's position and nothing else. The file format itself
 * is unverified against a real Procreate (see docs/paint-plan-audit.md, Phase 4).
 *
 * This calls the exporter directly: the simple version has no tiers, so no color limit other
 * than Procreate's own 30 applies. A plan has 12 piles at most.
 */
import { createSwatchesFile, downloadSwatchesFile, MAX_PROCREATE_COLORS, swatchesFilename } from '../../procreateExport'
import type { ProcreateColor } from '../../types/procreate'
import type { PlanExport } from './export'

/** Said next to the button: what is in the file, and what it is not. */
export const PROCREATE_NOTE = 'Saves each pile’s predicted color, dark to light, so swatch 1 is Pile 1. These are on-screen predictions, not measured paint, and Procreate may show them a little differently.'

/** Long picture names are cut so the palette list stays readable. */
const MAX_TITLE = 28

export interface ProcreatePalette {
    /** Shown in Procreate's palette list */
    paletteName: string
    /** One per pile, in pile order; Procreate holds 30, so a longer plan is cut and `omitted` says by how many */
    colors: ProcreateColor[]
    omitted: number
    /** What the download will be called */
    filename: string
}

export function planToProcreatePalette(model: PlanExport): ProcreatePalette {
    const title = model.title.length > MAX_TITLE ? `${model.title.slice(0, MAX_TITLE - 1).trimEnd()}…` : model.title
    const paletteName = `${title} · ${model.pileCountLabel}`
    const kept = model.piles.slice(0, MAX_PROCREATE_COLORS)
    return {
        paletteName,
        colors: kept.map((pile) => ({ hex: pile.swatchHex, name: pile.name })),
        omitted: model.piles.length - kept.length,
        filename: swatchesFilename(paletteName),
    }
}

/** Builds the file and hands it to the browser as a download. Local only: a Blob and an <a download>. */
export async function savePlanAsProcreatePalette(model: PlanExport): Promise<{ filename: string; count: number; omitted: number }> {
    const palette = planToProcreatePalette(model)
    if (palette.colors.length === 0) throw new Error('No piles to save')
    const blob = await createSwatchesFile(palette.colors, { paletteName: palette.paletteName })
    downloadSwatchesFile(blob, palette.paletteName)
    return { filename: palette.filename, count: palette.colors.length, omitted: palette.omitted }
}
