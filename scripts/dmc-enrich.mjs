/**
 * Build-time enrichment for the DMC solid floss catalog.
 * Derives color-card families, shade steps, OKLab metrics, and browse indexes.
 */

import { converter } from 'culori'

const toOklab = converter('oklab')

/** Longest-first so "Very Light" wins over "Light". */
const SHADE_SUFFIXES = [
  { re: /\s+Ultra Very Light$/i, step: 'very-light' },
  { re: /\s+Ult Vy Lt$/i, step: 'very-light' },
  { re: /\s+Extra Light$/i, step: 'very-light' },
  { re: /\s+Very Light$/i, step: 'very-light' },
  { re: /\s+Ultra Very Dark$/i, step: 'very-dark' },
  { re: /\s+Ult Vy Dk$/i, step: 'very-dark' },
  { re: /\s+Extra Dark$/i, step: 'very-dark' },
  { re: /\s+Very Dark$/i, step: 'very-dark' },
  { re: /\s+Pale$/i, step: 'very-light' },
  { re: /\s+Light$/i, step: 'light' },
  { re: /\s+Medium$/i, step: 'medium' },
  { re: /\s+Dark$/i, step: 'dark' },
]

/**
 * @param {string} name
 * @returns {{ stem: string, shadeStep: string }}
 */
export function parseDmcName(name) {
  for (const { re, step } of SHADE_SUFFIXES) {
    if (re.test(name)) {
      return {
        stem: name.replace(re, '').trim(),
        shadeStep: step,
      }
    }
  }

  return { stem: name.trim(), shadeStep: 'unspecified' }
}

/**
 * @param {string} stem
 */
export function slugifyFamilyId(stem) {
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * @param {{ r: number, g: number, b: number }} rgb
 */
export function rgbToOklabRecord(rgb) {
  const color = toOklab({ mode: 'rgb', r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 })
  return {
    L: round(color.l, 4),
    a: round(color.a, 4),
    b: round(color.b, 4),
  }
}

/**
 * @param {{ L: number, a: number, b: number }} oklab
 */
export function oklabToHueBucket(oklab) {
  const chroma = Math.hypot(oklab.a, oklab.b)
  if (chroma < 0.03) {
    return 'neutral'
  }

  const hue = ((Math.atan2(oklab.b, oklab.a) * 180) / Math.PI + 360) % 360

  if (hue < 20 || hue >= 340) return 'red'
  if (hue < 45) return 'red-orange'
  if (hue < 70) return 'orange'
  if (hue < 95) return 'yellow'
  if (hue < 130) return 'yellow-green'
  if (hue < 165) return 'green'
  if (hue < 200) return 'cyan'
  if (hue < 250) return 'blue'
  if (hue < 290) return 'violet'
  if (hue < 330) return 'magenta'
  return 'red'
}

/**
 * @param {{ L: number, a: number, b: number }} oklab
 */
export function oklabToWarmth(oklab) {
  const chroma = Math.hypot(oklab.a, oklab.b)
  if (chroma < 0.03) {
    return 'neutral'
  }

  const hue = ((Math.atan2(oklab.b, oklab.a) * 180) / Math.PI + 360) % 360

  if (hue < 85 || hue >= 320) return 'warm'
  if (hue >= 140 && hue < 280) return 'cool'
  return 'neutral'
}

/**
 * @param {Array<{ number: string, name: string, rgb: { r: number, g: number, b: number }, hex: string }>} colors
 */
export function segmentColorCardFamilies(colors) {
  /** @type {Array<{ stem: string, entries: Array<{ color: typeof colors[0], shadeStep: string }> }>} */
  const runs = []

  for (const color of colors) {
    const { stem, shadeStep } = parseDmcName(color.name)
    const last = runs[runs.length - 1]

    if (!last || last.stem !== stem) {
      runs.push({ stem, entries: [{ color, shadeStep }] })
    } else {
      last.entries.push({ color, shadeStep })
    }
  }

  return runs
}

/**
 * @param {Array<{ number: string, name: string, rgb: { r: number, g: number, b: number }, hex: string }>} colors
 */
export function enrichDmcCatalog(colors) {
  const runs = segmentColorCardFamilies(colors)
  const familyIdCounts = new Map()

  /** @type {typeof colors[0] & Record<string, unknown>[]} */
  const threads = []
  /** @type {Array<{ id: string, label: string, threadIds: string[], threadNumbers: string[], hueBucket: string }>} */
  const families = []

  for (const run of runs) {
    const baseId = slugifyFamilyId(run.stem) || 'unknown'
    const seen = (familyIdCounts.get(baseId) ?? 0) + 1
    familyIdCounts.set(baseId, seen)
    const familyId = seen > 1 ? `${baseId}-${seen}` : baseId

    const withOklab = run.entries.map(({ color, shadeStep }) => {
      const oklab = rgbToOklabRecord(color.rgb)
      return { color, shadeStep, oklab }
    })

    withOklab.sort((a, b) => b.oklab.L - a.oklab.L)

    const familySize = withOklab.length
    const threadIds = []
    const threadNumbers = []
    let dominantHue = 'neutral'

    withOklab.forEach((entry, shadeRank) => {
      const { color, shadeStep, oklab } = entry
      const id = `dmc:${color.number}`
      const hueBucket = oklabToHueBucket(oklab)

      if (shadeRank === 0) {
        dominantHue = hueBucket
      }

      threadIds.push(id)
      threadNumbers.push(color.number)

      threads.push({
        id,
        brand: 'dmc',
        number: color.number,
        name: color.name,
        rgb: color.rgb,
        hex: color.hex,
        productLine: 'mouline-solid',
        familyId,
        familyLabel: run.stem,
        shadeStep,
        shadeRank,
        familySize,
        oklab,
        hueBucket,
        warmth: oklabToWarmth(oklab),
      })
    })

    families.push({
      id: familyId,
      label: run.stem,
      threadIds,
      threadNumbers,
      hueBucket: dominantHue,
    })
  }

  return { threads, families }
}

/**
 * @param {number} value
 * @param {number} digits
 */
function round(value, digits) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
