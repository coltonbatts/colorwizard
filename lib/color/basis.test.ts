import { describe, expect, it } from 'vitest'
import { BASES, BASIS_LABELS, NOT_VERIFIED } from './basis'
import { describeThreadFit } from '../dmc/threadFit'
import { MODEL_CAVEAT } from '../paint/paintFit'

describe('basis', () => {
  it('claims physical verification for nothing, until a physical check exists', () => {
    for (const info of Object.values(BASES)) {
      expect(info.basis).not.toBe('verified')
      expect(info.label).not.toBe(BASIS_LABELS.verified)
      expect(`${info.how} ${info.limits.join(' ')}`).not.toMatch(/verified|measured from real|tested/i)
    }
    expect(NOT_VERIFIED).toBe('No physical check has been done.')
  })

  it('labels paint as calculated and thread and names as catalog', () => {
    expect(BASES.paint.basis).toBe('calculated')
    expect(BASES.relationships.basis).toBe('calculated')
    expect(BASES.thread.basis).toBe('catalog')
    expect(BASES.name.basis).toBe('catalog')
  })

  it('says nothing was mixed or measured for paint, and where thread colors come from', () => {
    expect(BASES.paint.how).toMatch(/Nothing was mixed or measured/)
    expect(BASES.thread.how).toMatch(/DMC does not publish color values/)
    expect(BASES.thread.how).toMatch(/product photos/)
    expect(MODEL_CAVEAT).toBe('Predicted on screen from swatch colors, not measured from real tubes.')
  })

  it('names what changes paint and thread in each medium’s own terms', () => {
    expect(BASES.paint.limits.join(' ')).toMatch(/batch|dries|lighting/)
    expect(BASES.thread.limits.join(' ')).toMatch(/Dye lot/)
    expect(BASES.thread.limits.join(' ')).toMatch(/strands/)
    expect(BASES.thread.limits.join(' ')).toMatch(/fabric/)
  })
})

describe('describeThreadFit', () => {
  it('never says exact, at any distance', () => {
    for (let de = 0; de <= 30; de += 0.25) {
      const { label, detail } = describeThreadFit(de)
      expect(`${label} ${detail}`).not.toMatch(/exact/i)
    }
  })

  it('uses catalog language for the label and flags a visible miss', () => {
    expect(describeThreadFit(0.4).label).toBe('Very close in catalog')
    expect(describeThreadFit(3).label).toBe('Fair in catalog')
    expect(describeThreadFit(7).detail).toMatch(/Nearest available, and visibly different/)
    expect(describeThreadFit(7).detail).toContain('ΔE₀₀ 7.0')
  })

  it('warns when the catalog color itself is approximate', () => {
    expect(describeThreadFit(0.4, 'approximate').detail).toMatch(/approximate, so it may be further off/)
    expect(describeThreadFit(0.4, 'measured').detail).not.toMatch(/approximate/)
  })
})
