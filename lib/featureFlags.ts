/**
 * Feature Flags System for ColorWizard.
 * Desktop licensing grants the full app; unlicensed and web preview modes stay limited.
 */

export type UserTier = 'free' | 'pro' | 'pro_lifetime'

/**
 * PRO-ONLY features (everything else is free)
 * These are genuine value-adds, not artificial gatekeeping
 */
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
 * Master feature configuration - ONLY pro features listed
 * Everything else is available to free users
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
 * What's FREE (no gating, no limits)
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
 * What's license-only
 */
export const PRO_ONLY_FEATURES = [
  'AI palette suggestions',
  'Team collaboration & sharing',
  'Advanced presets',
]

/**
 * Check if a feature is Pro-only (and user needs to upgrade)
 */
export function isProOnlyFeature(featureName: string): boolean {
  return (Object.keys(PRO_FEATURES) as ProOnlyFeature[]).includes(featureName as ProOnlyFeature)
}

/**
 * Check if user has access to a Pro feature
 */
export function hasAccessToProFeature(featureName: ProOnlyFeature, tier: UserTier): boolean {
  if (!isProOnlyFeature(featureName)) {
    // If it's not in the pro-only list, it's free for everyone
    return true
  }

  // Pro features require Pro tier (subscription or lifetime)
  return tier === 'pro' || tier === 'pro_lifetime'
}

/**
 * Get all Pro-only features
 */
export function getProFeatures(): FeatureConfig[] {
  return Object.values(PRO_FEATURES)
}

/**
 * Get numerical limit for a feature based on user tier
 */
export function getFeatureLimit(featureName: string, tier: UserTier): number {
  if (featureName === 'exportToProcreate') {
    return tier === 'free' ? 5 : Infinity
  }

  // Default to Infinity for features without explicitly defined limits
  return Infinity
}
