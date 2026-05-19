/**
 * DMC Embroidery Floss Color Database and Matching
 * Data is loaded lazily from /data/dmc-floss.json and cached in memory.
 */

import { loadDmcCatalog } from './dmc/catalog'
import { rankDmcThreadsByDeltaE } from './dmc/match'
import type { DMCColor } from './dmcFlossTypes'

export type { DMCColor } from './dmcFlossTypes'
export {
  getThreadMatchContext,
  rankDmcThreadsByDeltaE,
} from './dmc/match'
export type {
  ImageValueBand,
  ImageValueContext,
  SampleValueContext,
  ScoredDMCThread,
  SuggestedRenderingSet,
  ThreadLadderPosition,
  ThreadMatchResult,
  ValueWarning,
} from './dmc/types'
export { buildImageValueContext } from './dmc/match'

export interface DMCMatch extends DMCColor {
  /** CIEDE2000 distance (same value as `distance`). */
  deltaE00: number
  distance: number
  similarity: number
  confidenceLabel: string
  confidenceColor: string
  confidenceBgColor: string
}

/**
 * Finds the closest DMC embroidery floss colors to a given RGB color
 * using CIEDE2000 (ΔE₀₀) for perceptual accuracy.
 */
export async function findClosestDMCColors(
  rgb: { r: number; g: number; b: number },
  count: number = 5
): Promise<DMCMatch[]> {
  if (count <= 0) return []

  const { threads } = await loadDmcCatalog()
  const ranked = rankDmcThreadsByDeltaE(rgb, threads)

  return ranked.slice(0, count).map((thread) => ({
    ...thread,
    deltaE00: thread.deltaE00,
    distance: thread.deltaE00,
    similarity: Math.max(0, 100 - thread.deltaE00),
  }))
}
