/**
 * The brunaille brown: one warm earth hue, from near black to near white, addressed by
 * perceptual value (CIE L* / 100, the same scale as the Value view).
 *
 * These are screen colors chosen to read as a raw-umber-like monochrome. They are not paint
 * matches; mixing them from a palette is a separate, later step.
 */

import { oklabToSrgb8 } from '@/lib/paint/plan/color'
import { getPerceptualValue } from '@/lib/valueScale'

/** OKLab hue of the brown, radians (about 65°, a warm earth). */
const HUE = (65 * Math.PI) / 180
/** Peak OKLab chroma, reached at middle value; ends fade to neutral so the extremes stay in gamut. */
const PEAK_CHROMA = 0.075

function brownAtOklabL(L: number): [number, number, number] {
  const chroma = PEAK_CHROMA * 4 * L * (1 - L)
  return oklabToSrgb8(L, chroma * Math.cos(HUE), chroma * Math.sin(HUE))
}

const cache = new Map<number, [number, number, number]>()

/** The brown whose perceptual value is `value01` (0 black … 1 white), as sRGB bytes. */
export function brownForValue(value01: number): [number, number, number] {
  const v = Math.min(1, Math.max(0, value01))
  const key = Math.round(v * 1000)
  const hit = cache.get(key)
  if (hit) return hit
  // OKLab L is monotonic in value for this hue; bisect for the one that lands on the asked value.
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const [r, g, b] = brownAtOklabL(mid)
    if (getPerceptualValue(r, g, b) < v) lo = mid
    else hi = mid
  }
  const rgb = brownAtOklabL((lo + hi) / 2)
  cache.set(key, rgb)
  return rgb
}
