/**
 * Feature Flags System for ColorWizard.
 * Desktop licensing grants the full app; web preview mode stays limited.
 */

export type UserTier = 'free' | 'licensed'

/** License-only features. Everything else stays available in the preview. */
export type ProOnlyFeature =
  | 'aiPaletteSuggestions'
  | 'teamCollaboration'
  | 'advancedPresets'

// Alias for backward compatibility
export type FeatureName = ProOnlyFeature

export interface FeatureConfig {
  name: ProOnlyFeature
  label: string
  description: string
  category: 'ai' | 'collaboration' | 'productivity'
}

/**
 * Master feature configuration. Only license-only features are listed here.
 */
export const PRO_FEATURES: Record<ProOnlyFeature, FeatureConfig> = {
  aiPaletteSuggestions: {
    name: 'aiPaletteSuggestions',
    label: 'AI Palette Suggestions',
    description: 'Get AI-powered color harmony suggestions based on color theory',
    category: 'ai',
  },
  teamCollaboration: {
    name: 'teamCollaboration',
    label: 'Team Collaboration',
    description: 'Share palettes and collaborate with team members in real-time',
    category: 'collaboration',
  },
  advancedPresets: {
    name: 'advancedPresets',
    label: 'Advanced Presets',
    description: 'Access to curated color harmony presets and advanced workflows',
    category: 'productivity',
  },
}

// Alias for backward compatibility
export const FEATURES = PRO_FEATURES

/**
 * What's available without a desktop license.
 */
export const FREE_FEATURES = [
  'Core color sampling and analysis',
  'Palette generation and export',
  'Reference image workflows',
  'Full color analysis tools',
  'Standard color filters',
  'Oil paint color mixing',
  'DMC floss matching',
  'Custom calibration',
  'Offline-first local workflow',
]

/**
 * What's license-only.
 */
export const PRO_ONLY_FEATURES = [
  'AI palette suggestions',
  'Team collaboration & sharing',
  'Advanced presets',
]

/**
 * Check if a feature is license-only.
 */
export function isProOnlyFeature(featureName: string): boolean {
  return (Object.keys(PRO_FEATURES) as ProOnlyFeature[]).includes(featureName as ProOnlyFeature)
}

/**
 * Check if user has access to a license-only feature.
 */
export function hasAccessToProFeature(featureName: ProOnlyFeature, tier: UserTier): boolean {
  if (!isProOnlyFeature(featureName)) {
    // If it's not in the pro-only list, it's free for everyone
    return true
  }

  return tier === 'licensed'
}

/**
 * Get all license-only features.
 */
export function getProFeatures(): FeatureConfig[] {
  return Object.values(PRO_FEATURES)
}

/**
 * Get numerical limit for a feature based on user tier
 */
export function getFeatureLimit(featureName: string, tier: UserTier): number {
  if (featureName === 'exportToProcreate') {
    return tier === 'licensed' ? Infinity : 5
  }

  // Default to Infinity for features without explicitly defined limits
  return Infinity
}
