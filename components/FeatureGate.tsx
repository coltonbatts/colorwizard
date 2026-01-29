/**
 * FeatureGate Wrapper Component
 * Wraps content and shows upgrade prompt if access denied
 * 
 * Usage:
 * <FeatureGate feature="aiPaletteSuggestions" featureName="AI Suggestions">
 *   <AIPaletteComponent />
 * </FeatureGate>
 */

'use client'

import { ReactNode } from 'react'
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import { type FeatureName, FEATURES } from '@/lib/featureFlags'
import UpgradePrompt from './UpgradePrompt'

interface FeatureGateProps {
  feature: FeatureName
  children: ReactNode
  fallback?: ReactNode
  showPromptOnClick?: boolean
}

export default function FeatureGate({
  feature,
  children,
  fallback,
  showPromptOnClick = false,
}: FeatureGateProps) {
  const {
    hasAccess,
    showUpgradePrompt,
    setShowUpgradePrompt,
    handleUpgradeClick,
    isUpgrading,
  } = useFeatureAccess(feature)

  const featureConfig = FEATURES[feature]

  if (hasAccess) {
    return <>{children}</>
  }

  // If not showPromptOnClick, show fallback (disabled state)
  if (!showPromptOnClick) {
    return (
      <div className="opacity-50 pointer-events-none cursor-not-allowed">
        {fallback || children}
      </div>
    )
  }

  // If showPromptOnClick, wrap children with click handler
  return (
    <>
      <div
        onClick={() => setShowUpgradePrompt(true)}
        className="cursor-pointer relative"
        title={`Upgrade to Pro to access ${featureConfig.label}`}
      >
        {children}
        <div className="absolute inset-0 bg-black/5 rounded opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
            Upgrade to Pro
          </span>
        </div>
      </div>

      <UpgradePrompt
        featureName={featureConfig.label}
        featureDescription={featureConfig.description}
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgradeClick={handleUpgradeClick}
        isLoading={isUpgrading}
      />
    </>
  )
}
