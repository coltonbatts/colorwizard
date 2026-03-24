/**
 * DMC Embroidery Floss Color Database and Matching
 * Data is loaded lazily from /data/dmc-floss.json and cached in memory.
 */

import { rgbToLab, deltaE, getMatchConfidence, Lab } from './colorUtils'
import { getDmcFloss } from './dataCache'
import type { DMCColor } from './dmcFlossTypes'

export type { DMCColor } from './dmcFlossTypes'

export interface DMCMatch extends DMCColor {
  distance: number
  similarity: number
  confidenceLabel: string
  confidenceColor: string
  confidenceBgColor: string
}

/**
 * Finds the closest DMC embroidery floss colors to a given RGB color
 * using Delta E (CIEDE2000) for perceptual accuracy.
 */
export async function findClosestDMCColors(
  rgb: { r: number; g: number; b: number },
  count: number = 5
): Promise<DMCMatch[]> {
  if (count <= 0) return []

  const targetLab = rgbToLab(rgb.r, rgb.g, rgb.b)
  const dmcColors = await getDmcFloss()

  const matches = dmcColors.map((dmcColor) => {
    if (!dmcColor.lab) {
      dmcColor.lab = rgbToLab(dmcColor.rgb.r, dmcColor.rgb.g, dmcColor.rgb.b)
    }

    const distance = deltaE(targetLab, dmcColor.lab as Lab)
    const similarity = Math.max(0, 100 - distance)
    const { label, color, bgColor } = getMatchConfidence(distance)

    return {
      ...dmcColor,
      distance,
      similarity,
      confidenceLabel: label,
      confidenceColor: color,
      confidenceBgColor: bgColor,
    }
  })

  return matches.sort((a, b) => a.distance - b.distance).slice(0, count)
}
