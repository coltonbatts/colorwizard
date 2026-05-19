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
  ScoredDMCThread,
  ThreadLadderPosition,
  ThreadMatchResult,
} from './dmc/types'

export interface DMCMatch extends DMCColor {
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
    distance: thread.deltaE00,
    similarity: Math.max(0, 100 - thread.deltaE00),
  }))
}
