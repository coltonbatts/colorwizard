import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { hexToHsb } from '../../colorConversion'
import { createSwatchesFile, MAX_PROCREATE_COLORS, swatchesFilename } from '../../procreateExport'
import { DEFAULT_PALETTE } from '../../types/palette'
import { resolvePalettePigments } from '../palettePigments'
import { PALETTES } from './benchmark'
import { describePlanForExport, type PlanExport } from './export'
import { loadCorpus } from './fixtures/corpus'
import { planPicture } from './picture'
import { planToProcreatePalette } from './procreatePalette'

const corpus = loadCorpus('synthetic')
const OPTIONS = { paletteName: 'The Core six' }

async function model(name: string, budget: number, pigments = PALETTES.core6.pigments): Promise<PlanExport> {
  const image = corpus.find((i) => i.name === name)!
  return describePlanForExport(await planPicture(image.data, image.width, image.height, budget, pigments), { ...OPTIONS, pictureName: name })
}

/** Unzips a .swatches blob the way Procreate would have to: a zip with Swatches.json at its root. */
async function unzip(blob: Blob) {
  const zip = await JSZip.loadAsync(new Uint8Array(await blob.arrayBuffer()))
  const names = Object.keys(zip.files)
  const json = JSON.parse(await zip.file('Swatches.json')!.async('string')) as { name: string; swatches: Array<{ hue: number; saturation: number; brightness: number; alpha: number; colorSpace: number } | null> }
  return { names, json }
}

/** Standard HSB (HSV) to 8-bit RGB, written independently of lib/colorConversion. */
function hsbToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6) % 6
  const f = h * 6 - Math.floor(h * 6)
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i]
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}
const rgbOf = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))

async function palette(colors: string[], paletteName = 'Test') {
  return unzip(await createSwatchesFile(colors.map((hex) => ({ hex })), { paletteName }))
}

describe('the .swatches file for a plan', () => {
  it('is a zip with Swatches.json at the root, the palette name, and 30 slots: 12 swatches then null padding', async () => {
    const m = await model('portrait-light', 12)
    const built = planToProcreatePalette(m)
    const { names, json } = await unzip(await createSwatchesFile(built.colors, { paletteName: built.paletteName }))
    expect(names).toEqual(['Swatches.json']) // exactly this name; case matters to Procreate
    expect(json.name).toBe('portrait-light · 12 piles')
    expect(json.swatches).toHaveLength(MAX_PROCREATE_COLORS)
    expect(json.swatches.slice(0, 12).every((s) => s !== null)).toBe(true)
    expect(json.swatches.slice(12).every((s) => s === null)).toBe(true)
  })

  it('writes only the fields the format is known to have: no per-swatch name, nothing invented', async () => {
    const built = planToProcreatePalette(await model('landscape', 8))
    const { json } = await unzip(await createSwatchesFile(built.colors, { paletteName: built.paletteName }))
    for (const swatch of json.swatches.filter((s) => s !== null)) {
      expect(Object.keys(swatch!).sort()).toEqual(['alpha', 'brightness', 'colorSpace', 'hue', 'saturation'])
      expect(swatch!.alpha).toBe(1)
      expect(swatch!.colorSpace).toBe(0)
    }
  })

  it('keeps swatch N as Pile N, in the plan’s dark-to-light order, with the predicted swatch colors', async () => {
    for (const [name, budget] of [['landscape', 8], ['sunset', 5], ['high-key', 12]] as const) {
      const m = await model(name, budget)
      const built = planToProcreatePalette(m)
      expect(built.colors.map((c) => c.hex)).toEqual(m.piles.map((p) => p.swatchHex))
      expect(built.colors.map((c) => c.name)).toEqual(m.piles.map((p) => p.name))
      const { json } = await unzip(await createSwatchesFile(built.colors, { paletteName: built.paletteName }))
      m.piles.forEach((pile, i) => {
        const s = json.swatches[i]!
        const back = hsbToRgb(s.hue, s.saturation, s.brightness)
        const want = rgbOf(pile.swatchHex)
        back.forEach((c, k) => expect(Math.abs(c - want[k])).toBeLessThanOrEqual(1))
      })
    }
  })

  it('names the palette and file from the picture and the pile count, without padding "8 of 12"', async () => {
    const m = await model('high-key', 12)
    const built = planToProcreatePalette(m)
    expect(m.pileCount).toBeLessThan(12)
    expect(built.paletteName).toBe(`high-key · ${m.pileCount} of 12 piles`)
    expect(built.filename).toBe(`high-key-${m.pileCount}-of-12-piles.swatches`)
    expect(built.colors).toHaveLength(m.pileCount)
    const anon = planToProcreatePalette({ ...m, title: 'Paint plan', pictureName: null })
    expect(anon.filename).toMatch(/^paint-plan-\d+-of-12-piles\.swatches$/)
    const long = planToProcreatePalette({ ...m, title: 'A very long picture name that would crowd the palette list' })
    expect(long.paletteName).toBe(`A very long picture name th… · ${m.pileCountLabel}`) // title cut to 28 characters, ellipsis included
    expect(long.paletteName).toContain('…')
  })

  it('exports a palette with a custom tube', async () => {
    const magenta = { id: 'custom-magenta-c2185b', displayName: 'Quinacridone Magenta', hex: '#C2185B', tintingStrength: 2 }
    const m = await model('fruit-saturated', 8, resolvePalettePigments([...DEFAULT_PALETTE.colors, magenta]))
    const built = planToProcreatePalette(m)
    const { json } = await unzip(await createSwatchesFile(built.colors, { paletteName: built.paletteName }))
    expect(json.swatches.filter((s) => s !== null)).toHaveLength(m.pileCount)
    expect(built.omitted).toBe(0)
  })

  it('handles more than 30 piles by keeping the first 30 and saying how many were left out', async () => {
    const m = await model('landscape', 12)
    const many: PlanExport = { ...m, piles: Array.from({ length: 34 }, (_, i) => ({ ...m.piles[i % m.piles.length], number: i + 1, name: `Pile ${i + 1}` })), pileCount: 34, pileCountLabel: '34 piles' }
    const built = planToProcreatePalette(many)
    expect(built.colors).toHaveLength(30)
    expect(built.omitted).toBe(4)
    expect(built.colors[29].name).toBe('Pile 30')
    const { json } = await unzip(await createSwatchesFile(built.colors, { paletteName: built.paletteName }))
    expect(json.swatches).toHaveLength(30)
    expect(json.swatches.every((s) => s !== null)).toBe(true)
  })
})

describe('HSB units', () => {
  // Procreate stores hue, saturation and brightness as 0..1 (see lib/types/procreate.ts). Known colors, hue in degrees / 360.
  const known: Array<[string, number, number, number]> = [
    ['#FF0000', 0, 1, 1],
    ['#FFFF00', 60 / 360, 1, 1],
    ['#00FF00', 120 / 360, 1, 1],
    ['#00FFFF', 180 / 360, 1, 1],
    ['#0000FF', 240 / 360, 1, 1],
    ['#FF00FF', 300 / 360, 1, 1],
    ['#FF8000', 30 / 360, 1, 1],
    ['#000000', 0, 0, 0],
    ['#FFFFFF', 0, 0, 1],
    ['#808080', 0, 0, 128 / 255],
    ['#800000', 0, 1, 128 / 255],
    ['#C2185B', 336.35 / 360, 0.8763, 0.7608],
  ]
  it.each(known)('%s is hue %d, saturation %d, brightness %d on the 0..1 scale', async (hex, h, s, b) => {
    const { json } = await palette([hex])
    const swatch = json.swatches[0]!
    expect(swatch.hue).toBeCloseTo(h, 3)
    expect(swatch.saturation).toBeCloseTo(s, 3)
    expect(swatch.brightness).toBeCloseTo(b, 3)
  })

  it('round-trips a spread of colors to the source hex within one 8-bit level', () => {
    const colors: string[] = []
    for (const r of [0, 255]) for (const g of [0, 255]) for (const b of [0, 255]) colors.push(`#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`)
    for (let v = 0; v <= 255; v += 5) colors.push(`#${v.toString(16).padStart(2, '0').repeat(3)}`) // grays
    let seed = 7
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
    for (let i = 0; i < 500; i++) colors.push(`#${[0, 0, 0].map(() => Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('')}`)
    let worst = 0
    for (const hex of colors) {
      const { h, s, b } = hexToHsb(hex)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(1)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(1)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(1)
      const back = hsbToRgb(h, s, b)
      const want = rgbOf(hex)
      for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(back[k] - want[k]))
    }
    expect(worst).toBeLessThanOrEqual(1)
  })
})

describe('swatchesFilename', () => {
  it('lowercases, collapses punctuation, and always ends in .swatches', () => {
    expect(swatchesFilename('Landscape · 8 piles')).toBe('landscape-8-piles.swatches')
    expect(swatchesFilename('  ')).toBe('palette.swatches')
    expect(swatchesFilename('../../etc/passwd')).toBe('etc-passwd.swatches')
  })
})
