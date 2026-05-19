import { describe, expect, it } from 'vitest'
import { buildSuggestedRenderingSet, buildValueWarnings } from './valueAnalysis'
import type { SampleValueContext, ScoredDMCThread } from './types'

function mockThread(overrides: Partial<ScoredDMCThread> & Pick<ScoredDMCThread, 'id' | 'number' | 'oklab'>): ScoredDMCThread {
  return {
    brand: 'dmc',
    name: 'Test',
    rgb: { r: 128, g: 128, b: 128 },
    hex: '#808080',
    productLine: 'mouline-solid',
    familyId: 'gray',
    familyLabel: 'Gray',
    shadeStep: 'medium',
    shadeRank: 1,
    familySize: 3,
    hueBucket: 'neutral',
    warmth: 'neutral',
    deltaE00: 2,
    confidenceLabel: 'Close',
    confidenceColor: '',
    confidenceBgColor: '',
    ...overrides,
  }
}

const shadowSample: SampleValueContext = {
  oklabL: 0.25,
  normalizedPosition: 15,
  band: 'deepest-dark',
  bandLabel: 'Deepest dark',
  renderingRole: 'deepest-dark',
}

describe('valueAnalysis', () => {
  it('warns when hue match is too light for a shadow sample', () => {
    const primary = mockThread({
      id: 'a',
      number: '100',
      oklab: { L: 0.55, a: 0, b: 0 },
      shadeRank: 2,
    })

    const warnings = buildValueWarnings(shadowSample, primary)
    expect(warnings.some((w) => w.code === 'hue-match-too-light')).toBe(true)
  })

  it('suggests a multi-step rendering set from family ladder', () => {
    const primary = mockThread({ id: 'b', number: '760', oklab: { L: 0.5, a: 0.1, b: 0.05 }, shadeRank: 1 })
    const lighter = mockThread({ id: 'c', number: '761', oklab: { L: 0.7, a: 0.1, b: 0.05 }, shadeRank: 0 })
    const darker = mockThread({ id: 'd', number: '3712', oklab: { L: 0.35, a: 0.1, b: 0.05 }, shadeRank: 2 })
    const anchor = mockThread({ id: 'e', number: '347', oklab: { L: 0.2, a: 0.1, b: 0.05 }, shadeRank: 3 })

    const sample: SampleValueContext = {
      oklabL: 0.5,
      normalizedPosition: 50,
      band: 'mid',
      bandLabel: 'Midtone',
      renderingRole: 'mid',
    }

    const set = buildSuggestedRenderingSet(
      sample,
      primary,
      [lighter, primary, darker, anchor],
      [],
      { rank: 1, total: 4, lighter, darker },
    )

    const roles = set.suggestions.map((s) => s.role)
    expect(roles).toContain('base')
    expect(roles).toContain('highlight')
    expect(roles).toContain('shadow')
  })
})
