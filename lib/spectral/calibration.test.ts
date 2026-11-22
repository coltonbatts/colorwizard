import { describe, expect, it } from 'vitest'
import * as spectral from 'spectral.js'
import { fitStrengths, predictHex, measuredOnly, validateSwatchData, type Mix, type SwatchData } from './calibration'

const masstones = {
  'titanium-white': '#FDFDFD',
  'ivory-black': '#0B0B0B',
  'yellow-ochre': '#CC8E35',
  'cadmium-red': '#E52B21',
  'phthalo-blue': '#0F2E53',
}

/** "Measure" swatches from a known model, so the fit has a right answer. */
function synth(strengths: Record<string, number>, exponent: number): SwatchData {
  const tubes = ['ivory-black', 'yellow-ochre', 'cadmium-red', 'phthalo-blue']
  const mixes: Mix[] = []
  for (const tube of tubes) for (const white of [19, 9, 4, 1]) mixes.push({ parts: { 'titanium-white': white, [tube]: 1 }, hex: '', note: `${white}:1 ${tube}` })
  mixes.push({ parts: { 'titanium-white': 8, 'yellow-ochre': 2, 'cadmium-red': 1 }, hex: '', holdout: true, note: 'holdout warm' })
  mixes.push({ parts: { 'phthalo-blue': 1, 'yellow-ochre': 3 }, hex: '', holdout: true, note: 'holdout green' })
  const data: SwatchData = { masstones, mixes }
  return { masstones, mixes: mixes.map((mix) => ({ ...mix, hex: predictHex(spectral, data, mix, strengths, exponent) })) }
}

describe('calibration fit', () => {
  const truth = { 'titanium-white': 1, 'ivory-black': 2.5, 'yellow-ochre': 0.6, 'cadmium-red': 1.8, 'phthalo-blue': 6 }

  it('recovers known tinting strengths and reproduces held-out mixes', () => {
    const data = synth(truth, 1)
    const fit = fitStrengths(spectral, data, 1)
    for (const id of Object.keys(truth)) expect(fit.strengths[id] / truth[id as keyof typeof truth]).toBeCloseTo(1, 1)
    expect(fit.train.rms).toBeLessThan(0.3)
    expect(fit.holdout!.max).toBeLessThan(0.6)
  })

  it('tells the right weight model from the wrong one', () => {
    const data = synth(truth, 0.5)
    const right = fitStrengths(spectral, data, 0.5)
    const wrong = fitStrengths(spectral, data, 1)
    expect(right.train.rms).toBeLessThan(0.3)
    expect(wrong.train.rms).toBeGreaterThan(right.train.rms * 3)
  })

  it('still lands close when the measurements are noisy', () => {
    const clean = synth(truth, 1)
    let seed = 7
    const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 6
    const bump = (hex: string) => '#' + [1, 3, 5].map((i) => Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(i, i + 2), 16) + noise()))).toString(16).padStart(2, '0')).join('')
    const noisy = { ...clean, mixes: clean.mixes.map((mix) => ({ ...mix, hex: bump(mix.hex) })) }
    const fit = fitStrengths(spectral, noisy, 1)
    for (const id of ['ivory-black', 'cadmium-red', 'phthalo-blue']) expect(fit.strengths[id] / truth[id as keyof typeof truth]).toBeGreaterThan(0.7)
    for (const id of ['ivory-black', 'cadmium-red', 'phthalo-blue']) expect(fit.strengths[id] / truth[id as keyof typeof truth]).toBeLessThan(1.4)
  })
})

describe('swatch data', () => {
  it('flags bad hexes and unmeasured masstones, and skips unmeasured template rows', () => {
    const data: SwatchData = {
      masstones: { 'titanium-white': '#FDFDFD', 'ivory-black': '' },
      mixes: [
        { parts: { 'titanium-white': 9, 'ivory-black': 1 }, hex: 'grey' },
        { parts: { 'titanium-white': 4, 'ivory-black': 1 }, hex: '' },
      ],
    }
    const problems = validateSwatchData(data)
    expect(problems.some((p) => p.includes('not #RRGGBB'))).toBe(true)
    expect(problems.some((p) => p.includes('no measured masstone'))).toBe(true)
    expect(measuredOnly(data).mixes).toHaveLength(0)
  })
})
