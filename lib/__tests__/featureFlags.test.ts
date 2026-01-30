/**
 * Feature Flags Tests - Tier Gating Verification
 * 
 * This test suite verifies the core entitlement system:
 * - Free users cannot access pro features
 * - Pro users (subscription or lifetime) can access pro features
 * - Feature flag functions identify pro-only features correctly
 */

import { describe, it, expect } from 'vitest'
import {
  isProOnlyFeature,
  hasAccessToProFeature,
  getProFeatures,
  PRO_FEATURES,
  FREE_FEATURES,
  PRO_ONLY_FEATURES,
  type UserTier,
  type ProOnlyFeature,
} from '@/lib/featureFlags'

describe('featureFlags.ts - Tier Gating', () => {
  // ====================================================================
  // Test Suite 1: Pro-Only Feature Identification
  // ====================================================================

  describe('isProOnlyFeature', () => {
    it('should identify aiPaletteSuggestions as pro-only', () => {
      expect(isProOnlyFeature('aiPaletteSuggestions')).toBe(true)
    })

    it('should identify teamCollaboration as pro-only', () => {
      expect(isProOnlyFeature('teamCollaboration')).toBe(true)
    })

    it('should identify advancedPresets as pro-only', () => {
      expect(isProOnlyFeature('advancedPresets')).toBe(true)
    })

    it('should reject non-existent features as not pro-only', () => {
      expect(isProOnlyFeature('randomFeature')).toBe(false)
      expect(isProOnlyFeature('fakeAiFeature')).toBe(false)
      expect(isProOnlyFeature('')).toBe(false)
    })

    it('should have exactly 3 pro-only features', () => {
      const proFeatureNames = Object.keys(PRO_FEATURES)
      expect(proFeatureNames).toHaveLength(3)
      expect(proFeatureNames).toContain('aiPaletteSuggestions')
      expect(proFeatureNames).toContain('teamCollaboration')
      expect(proFeatureNames).toContain('advancedPresets')
    })
  })

  // ====================================================================
  // Test Suite 2: Free User Access Control (CRITICAL)
  // ====================================================================

  describe('hasAccessToProFeature - Free User', () => {
    const freeTier: UserTier = 'free'

    it('should deny free user access to aiPaletteSuggestions', () => {
      expect(hasAccessToProFeature('aiPaletteSuggestions', freeTier)).toBe(false)
    })

    it('should deny free user access to teamCollaboration', () => {
      expect(hasAccessToProFeature('teamCollaboration', freeTier)).toBe(false)
    })

    it('should deny free user access to advancedPresets', () => {
      expect(hasAccessToProFeature('advancedPresets', freeTier)).toBe(false)
    })

    it('should deny free user access to all pro features', () => {
      const proFeatures: ProOnlyFeature[] = [
        'aiPaletteSuggestions',
        'teamCollaboration',
        'advancedPresets',
      ]

      proFeatures.forEach((feature) => {
        expect(hasAccessToProFeature(feature, freeTier)).toBe(false)
      })
    })

    it('should grant free user access to non-pro features', () => {
      // Test with a feature that's not in the pro-only list
      expect(hasAccessToProFeature('paletteGeneration' as ProOnlyFeature, freeTier)).toBe(true)
      expect(hasAccessToProFeature('export' as ProOnlyFeature, freeTier)).toBe(true)
    })
  })

  // ====================================================================
  // Test Suite 3: Pro Lifetime User Access Control (CRITICAL)
  // ====================================================================

  describe('hasAccessToProFeature - Pro Lifetime User', () => {
    const proLifetimeTier: UserTier = 'pro_lifetime'

    it('should grant pro_lifetime user access to aiPaletteSuggestions', () => {
      expect(hasAccessToProFeature('aiPaletteSuggestions', proLifetimeTier)).toBe(true)
    })

    it('should grant pro_lifetime user access to teamCollaboration', () => {
      expect(hasAccessToProFeature('teamCollaboration', proLifetimeTier)).toBe(true)
    })

    it('should grant pro_lifetime user access to advancedPresets', () => {
      expect(hasAccessToProFeature('advancedPresets', proLifetimeTier)).toBe(true)
    })

    it('should grant pro_lifetime user access to all pro features', () => {
      const proFeatures: ProOnlyFeature[] = [
        'aiPaletteSuggestions',
        'teamCollaboration',
        'advancedPresets',
      ]

      proFeatures.forEach((feature) => {
        expect(hasAccessToProFeature(feature, proLifetimeTier)).toBe(true)
      })
    })

    it('should grant pro_lifetime user access to non-pro features', () => {
      expect(hasAccessToProFeature('paletteGeneration' as ProOnlyFeature, proLifetimeTier)).toBe(true)
    })
  })

  // ====================================================================
  // Test Suite 4: Pro Subscription User Access Control
  // ====================================================================

  describe('hasAccessToProFeature - Pro Subscription User', () => {
    const proSubscriptionTier: UserTier = 'pro'

    it('should grant pro subscription user access to aiPaletteSuggestions', () => {
      expect(hasAccessToProFeature('aiPaletteSuggestions', proSubscriptionTier)).toBe(true)
    })

    it('should grant pro subscription user access to teamCollaboration', () => {
      expect(hasAccessToProFeature('teamCollaboration', proSubscriptionTier)).toBe(true)
    })

    it('should grant pro subscription user access to advancedPresets', () => {
      expect(hasAccessToProFeature('advancedPresets', proSubscriptionTier)).toBe(true)
    })

    it('should grant pro subscription user access to all pro features', () => {
      const proFeatures: ProOnlyFeature[] = [
        'aiPaletteSuggestions',
        'teamCollaboration',
        'advancedPresets',
      ]

      proFeatures.forEach((feature) => {
        expect(hasAccessToProFeature(feature, proSubscriptionTier)).toBe(true)
      })
    })
  })

  // ====================================================================
  // Test Suite 5: Pro Feature Configuration
  // ====================================================================

  describe('PRO_FEATURES configuration', () => {
    it('should have correct structure for aiPaletteSuggestions', () => {
      const feature = PRO_FEATURES.aiPaletteSuggestions
      expect(feature).toHaveProperty('name', 'aiPaletteSuggestions')
      expect(feature).toHaveProperty('label')
      expect(feature).toHaveProperty('description')
      expect(feature).toHaveProperty('category')
      expect(feature.category).toBe('ai')
      expect(feature.label.length).toBeGreaterThan(0)
      expect(feature.description.length).toBeGreaterThan(0)
    })

    it('should have correct structure for teamCollaboration', () => {
      const feature = PRO_FEATURES.teamCollaboration
      expect(feature).toHaveProperty('name', 'teamCollaboration')
      expect(feature).toHaveProperty('label')
      expect(feature).toHaveProperty('description')
      expect(feature).toHaveProperty('category')
      expect(feature.category).toBe('collaboration')
    })

    it('should have correct structure for advancedPresets', () => {
      const feature = PRO_FEATURES.advancedPresets
      expect(feature).toHaveProperty('name', 'advancedPresets')
      expect(feature).toHaveProperty('label')
      expect(feature).toHaveProperty('description')
      expect(feature).toHaveProperty('category')
      expect(feature.category).toBe('productivity')
    })

    it('should have all categories present', () => {
      const categories = new Set(
        Object.values(PRO_FEATURES).map((f) => f.category)
      )
      expect(categories).toContain('ai')
      expect(categories).toContain('collaboration')
      expect(categories).toContain('productivity')
    })
  })

  // ====================================================================
  // Test Suite 6: Free Features Configuration
  // ====================================================================

  describe('FREE_FEATURES configuration', () => {
    it('should have free features listed', () => {
      expect(FREE_FEATURES.length).toBeGreaterThan(0)
    })

    it('should include unlimited palette generation', () => {
      expect(FREE_FEATURES).toContain('Unlimited palette generation')
    })

    it('should include all export formats', () => {
      expect(FREE_FEATURES).toEqual(
        expect.arrayContaining([
          expect.stringContaining('export'),
          expect.stringContaining('JSON'),
        ])
      )
    })

    it('should include Figma export', () => {
      expect(FREE_FEATURES).toEqual(
        expect.arrayContaining([expect.stringContaining('Figma')])
      )
    })

    it('should mention no tracking or watermarks', () => {
      expect(FREE_FEATURES).toEqual(
        expect.arrayContaining([
          expect.stringContaining('no watermarks'),
        ])
      )
    })
  })

  // ====================================================================
  // Test Suite 7: Pro vs Free Feature Lists
  // ====================================================================

  describe('PRO_ONLY_FEATURES configuration', () => {
    it('should have pro-only features listed', () => {
      expect(PRO_ONLY_FEATURES.length).toBeGreaterThan(0)
    })

    it('should include AI palette suggestions', () => {
      expect(PRO_ONLY_FEATURES).toEqual(
        expect.arrayContaining([expect.stringContaining('AI')])
      )
    })

    it('should include team collaboration', () => {
      expect(PRO_ONLY_FEATURES).toEqual(
        expect.arrayContaining([expect.stringContaining('collaboration')])
      )
    })

    it('should include advanced presets', () => {
      expect(PRO_ONLY_FEATURES).toEqual(
        expect.arrayContaining([expect.stringContaining('preset')])
      )
    })
  })

  // ====================================================================
  // Test Suite 8: getProFeatures Utility
  // ====================================================================

  describe('getProFeatures', () => {
    it('should return array of pro features', () => {
      const features = getProFeatures()
      expect(Array.isArray(features)).toBe(true)
      expect(features.length).toBe(3)
    })

    it('should return all three pro features', () => {
      const features = getProFeatures()
      const featureNames = features.map((f) => f.name)
      expect(featureNames).toContain('aiPaletteSuggestions')
      expect(featureNames).toContain('teamCollaboration')
      expect(featureNames).toContain('advancedPresets')
    })

    it('should return features with complete metadata', () => {
      const features = getProFeatures()
      features.forEach((feature) => {
        expect(feature.name).toBeTruthy()
        expect(feature.label).toBeTruthy()
        expect(feature.description).toBeTruthy()
        expect(feature.category).toBeTruthy()
      })
    })
  })

  // ====================================================================
  // Test Suite 9: Tier Gating Business Rules
  // ====================================================================

  describe('Tier Gating Business Rules', () => {
    it('should follow rule: free user denies all pro features', () => {
      const freeTier: UserTier = 'free'
      const proFeatures: ProOnlyFeature[] = [
        'aiPaletteSuggestions',
        'teamCollaboration',
        'advancedPresets',
      ]

      // Business rule: Free user should NOT have access to ANY pro feature
      proFeatures.forEach((feature) => {
        const hasAccess = hasAccessToProFeature(feature, freeTier)
        expect(hasAccess).toBe(false)
      })
    })

    it('should follow rule: pro_lifetime user grants all pro features', () => {
      const proLifetimeTier: UserTier = 'pro_lifetime'
      const proFeatures: ProOnlyFeature[] = [
        'aiPaletteSuggestions',
        'teamCollaboration',
        'advancedPresets',
      ]

      // Business rule: Pro lifetime user MUST have access to ALL pro features
      proFeatures.forEach((feature) => {
        const hasAccess = hasAccessToProFeature(feature, proLifetimeTier)
        expect(hasAccess).toBe(true)
      })
    })

    it('should follow rule: pro subscription user grants all pro features', () => {
      const proTier: UserTier = 'pro'
      const proFeatures: ProOnlyFeature[] = [
        'aiPaletteSuggestions',
        'teamCollaboration',
        'advancedPresets',
      ]

      // Business rule: Pro subscription user MUST have access to ALL pro features
      proFeatures.forEach((feature) => {
        const hasAccess = hasAccessToProFeature(feature, proTier)
        expect(hasAccess).toBe(true)
      })
    })

    it('should ensure no feature falls through cracks', () => {
      // Every pro feature must be explicitly gated for free users
      const proFeatures: ProOnlyFeature[] = [
        'aiPaletteSuggestions',
        'teamCollaboration',
        'advancedPresets',
      ]

      proFeatures.forEach((feature) => {
        const freeHasAccess = hasAccessToProFeature(feature, 'free')
        const proHasAccess = hasAccessToProFeature(feature, 'pro_lifetime')

        // Pro feature should be denied to free, granted to pro
        expect(freeHasAccess).toBe(false)
        expect(proHasAccess).toBe(true)
      })
    })
  })
})
