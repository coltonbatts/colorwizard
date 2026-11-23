import { describe, expect, it } from 'vitest'
import { resolvePalettePigments } from '../paint/palettePigments'
import { ciede2000 } from '../paint/plan/deltaE'
import { getLibrary } from '../paint/plan/library'
import { CORE_SIX_PIGMENT_IDS, EARTH_TUBES, PALETTE, PALETTE_MAP } from './palette'

describe('CORE_SIX_PIGMENT_IDS', () => {
  it('names six distinct pigments that are all in the palette', () => {
    expect(new Set(CORE_SIX_PIGMENT_IDS).size).toBe(6)
    for (const id of CORE_SIX_PIGMENT_IDS) expect(PALETTE_MAP.has(id), id).toBe(true)
  })
})

describe('EARTH_TUBES', () => {
  it('can be added to a palette by id, and stay out of PALETTE (the desktop MixLab draws one slider per PALETTE pigment)', () => {
    const ids = EARTH_TUBES.map((tube) => tube.id)
    expect(ids).toEqual(['burnt-sienna', 'burnt-umber'])
    for (const id of ids) expect(PALETTE.some((pigment) => pigment.id === id), id).toBe(false)
    const resolved = resolvePalettePigments(EARTH_TUBES.map((tube) => ({ id: tube.id, displayName: tube.name })))
    expect(resolved.map((pigment) => pigment.id)).toEqual(ids)
  })

  it('mixes the dark warm browns the Core six cannot', async () => {
    const core = CORE_SIX_PIGMENT_IDS.map((id) => PALETTE_MAP.get(id)!)
    const nearest = async (pigments: typeof core, [l, a, b]: number[]) => {
      const lib = await getLibrary(pigments)
      let best = Infinity
      for (let j = 0; j < lib.size; j++) best = Math.min(best, ciede2000(l, a, b, lib.lab[j * 3], lib.lab[j * 3 + 1], lib.lab[j * 3 + 2]))
      return best
    }
    // CIELAB of dark grounds like the owner's reference (L* 10-20, warm, yellow-leaning).
    // Measured: Core six 4.32 / 4.38 ΔE00; + Burnt Sienna 1.61 / 0.95; + Burnt Umber 2.10 / 0.75.
    for (const target of [[12, 3, 8], [20, 5, 14]]) {
      expect(await nearest(core, target)).toBeGreaterThan(4)
      for (const tube of EARTH_TUBES) expect(await nearest([...core, tube], target), tube.name).toBeLessThan(2.5)
    }
  }, 30000)
})
