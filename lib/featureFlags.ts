/**
 * Feature Flags System for ColorWizard Freemium Model
 * Maps user tier to feature availability
 */

export type UserTier = 'free' | 'pro'
export type FeatureName =
  | 'aiPaletteSuggestions'
  | 'exportToFigma'
  | 'exportToAdobe'
  | 'exportToFramer'
  | 'colorCollaboration'
  | 'advancedFilters'
  | 'advancedPresets'
  | 'prioritySupport'
  | 'exportToProcreate'
  | 'arTracing'

export interface FeatureConfig {
  name: FeatureName
  label: string
  description: string
  freeEnabled: boolean
  proEnabled: boolean
}

/**
 * Master feature configuration
 */
export const FEATURES: Record<FeatureName, FeatureConfig> = {
  aiPaletteSuggestions: {
    name: 'aiPaletteSuggestions',
    label: 'AI Palette Suggestions',
    description: 'Generate color harmonies using AI based on color theory',
    freeEnabled: false,
    proEnabled: true,
  },
  exportToFigma: {
    name: 'exportToFigma',
    label: 'Figma Export',
    description: 'Export palettes directly to Figma',
    freeEnabled: false,
    proEnabled: true,
  },
  exportToAdobe: {
    name: 'exportToAdobe',
    label: 'Adobe Export',
    description: 'Export to Adobe XD and Creative Cloud formats',
    freeEnabled: false,
    proEnabled: true,
  },
  exportToFramer: {
    name: 'exportToFramer',
    label: 'Framer Export',
    description: 'Export to Framer projects',
    freeEnabled: false,
    proEnabled: true,
  },
  colorCollaboration: {
    name: 'colorCollaboration',
    label: 'Team Collaboration',
    description: 'Share palettes and collaborate with team members',
    freeEnabled: false,
    proEnabled: true,
  },
  advancedFilters: {
    name: 'advancedFilters',
    label: 'Advanced Filters',
    description: 'Access to advanced color filtering options',
    freeEnabled: false,
    proEnabled: true,
  },
  advancedPresets: {
    name: 'advancedPresets',
    label: 'Advanced Presets',
    description: 'Premium color harmony and palette presets',
    freeEnabled: false,
    proEnabled: true,
  },
  prioritySupport: {
    name: 'prioritySupport',
    label: 'Priority Support',
    description: 'Fast-track support for Pro subscribers',
    freeEnabled: false,
    proEnabled: true,
  },
  exportToProcreate: {
    name: 'exportToProcreate',
    label: 'Procreate Export',
    description: 'Export palettes to Procreate (.swatches)',
    freeEnabled: true, // Enabled for both, but limited for Free
    proEnabled: true,
  },
  arTracing: {
    name: 'arTracing',
    label: 'AR Tracing',
    description: 'Project images onto your canvas using AR',
    freeEnabled: false,
    proEnabled: true,
  },
}

/**
 * Check if a feature is enabled for a given tier
 */
export function isFeatureEnabled(featureName: FeatureName, tier: UserTier): boolean {
  const feature = FEATURES[featureName]
  if (!feature) {
    console.warn(`Unknown feature: ${featureName}`)
    return false
  }

  return tier === 'pro' ? feature.proEnabled : feature.freeEnabled
}

/**
 * Get numerical limits for features (e.g. Procreate export color count)
 */
export function getFeatureLimit(featureName: FeatureName, tier: UserTier): number {
  if (featureName === 'exportToProcreate') {
    return tier === 'pro' ? 30 : 5
  }
  return Infinity
}

/**
 * Get all features available for a tier
 */
export function getFeaturesForTier(tier: UserTier): FeatureName[] {
  return (Object.keys(FEATURES) as FeatureName[]).filter(
    featureName => isFeatureEnabled(featureName, tier)
  )
}

/**
 * Get features only available in Pro tier
 */
export function getProOnlyFeatures(): FeatureConfig[] {
  return Object.values(FEATURES).filter(feature => !feature.freeEnabled && feature.proEnabled)
}
