import { describe, expect, it } from 'vitest'
import {
  FREE_FEATURES,
  PRO_ONLY_FEATURES,
  getFeatureLimit,
  getProFeatures,
  hasAccessToProFeature,
  isProOnlyFeature,
  type ProOnlyFeature,
} from '@/lib/featureFlags'

const licenseOnlyFeatures: ProOnlyFeature[] = [
  'aiPaletteSuggestions',
  'teamCollaboration',
  'advancedPresets',
]

describe('featureFlags', () => {
  it('identifies only configured license-only features', () => {
    for (const feature of licenseOnlyFeatures) {
      expect(isProOnlyFeature(feature)).toBe(true)
    }

    expect(isProOnlyFeature('paletteGeneration')).toBe(false)
    expect(isProOnlyFeature('')).toBe(false)
  })

  it('keeps license-only features unavailable in preview mode', () => {
    for (const feature of licenseOnlyFeatures) {
      expect(hasAccessToProFeature(feature, 'free')).toBe(false)
    }
  })

  it('unlocks license-only features for the desktop license tier', () => {
    for (const feature of licenseOnlyFeatures) {
      expect(hasAccessToProFeature(feature, 'licensed')).toBe(true)
    }
  })

  it('treats unknown feature names as preview-accessible', () => {
    expect(hasAccessToProFeature('paletteGeneration' as ProOnlyFeature, 'free')).toBe(true)
  })

  it('exposes feature metadata for the remaining gated surfaces', () => {
    const features = getProFeatures()

    expect(features).toHaveLength(licenseOnlyFeatures.length)
    expect(features.map((feature) => feature.name).sort()).toEqual([...licenseOnlyFeatures].sort())
  })

  it('documents free and license-only feature lists', () => {
    expect(FREE_FEATURES).toContain('Core color sampling and analysis')
    expect(PRO_ONLY_FEATURES).toContain('AI palette suggestions')
  })

  it('limits Procreate export size only in preview mode', () => {
    expect(getFeatureLimit('exportToProcreate', 'free')).toBe(5)
    expect(getFeatureLimit('exportToProcreate', 'licensed')).toBe(Infinity)
  })
})
