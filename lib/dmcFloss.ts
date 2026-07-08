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

/**
 * Converts RGB color to HSL representation
 */
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Categorizes a DMC color into a human-friendly color family.
 */
export function getDMCColorFamily(rgb: { r: number; g: number; b: number }, name: string): string {
  const lowercaseName = name.toLowerCase()
  
  if (lowercaseName.includes('white') || lowercaseName.includes('ecru') || lowercaseName.includes('snow')) {
    return 'Whites & Off-Whites'
  }
  if (lowercaseName.includes('black')) {
    return 'Blacks & Darks'
  }
  if (
    lowercaseName.includes('gray') || 
    lowercaseName.includes('grey') || 
    lowercaseName.includes('pewter') || 
    lowercaseName.includes('steel') || 
    lowercaseName.includes('beaver') || 
    lowercaseName.includes('ash')
  ) {
    return 'Grays & Pewters'
  }
  if (
    lowercaseName.includes('brown') || 
    lowercaseName.includes('mocha') || 
    lowercaseName.includes('cocoa') || 
    lowercaseName.includes('coffee') || 
    lowercaseName.includes('drab') || 
    lowercaseName.includes('hazelnut')
  ) {
    return 'Browns & Woodtones'
  }
  if (
    lowercaseName.includes('beige') || 
    lowercaseName.includes('khaki') || 
    lowercaseName.includes('tan') || 
    lowercaseName.includes('sand') || 
    lowercaseName.includes('cream')
  ) {
    return 'Beiges & Tans'
  }

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)

  if (l > 93) return 'Whites & Off-Whites'
  if (l < 12) return 'Blacks & Darks'
  if (s < 10) {
    if (l < 40) return 'Blacks & Darks'
    if (l < 85) return 'Grays & Pewters'
    return 'Whites & Off-Whites'
  }

  if (h < 18 || h >= 340) {
    if (l > 60 && s > 15) return 'Pinks & Roses'
    return 'Reds & Cranberries'
  }
  if (h >= 18 && h < 45) {
    if (l < 42) return 'Browns & Woodtones'
    return 'Oranges & Terracottas'
  }
  if (h >= 45 && h < 70) {
    if (s < 25) return 'Beiges & Tans'
    return 'Yellows & Golds'
  }
  if (h >= 70 && h < 165) {
    return 'Greens & Olives'
  }
  if (h >= 165 && h < 205) {
    return 'Teals & Peacocks'
  }
  if (h >= 205 && h < 255) {
    return 'Blues & Navies'
  }
  if (h >= 255 && h < 315) {
    return 'Purples & Violets'
  }
  return 'Pinks & Roses'
}

