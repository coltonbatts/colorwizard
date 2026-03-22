/**
 * FeatureGate wrapper component.
 * In open-source mode it becomes a pass-through.
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
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={() => setShowUpgradePrompt(true)}
          className="absolute inset-0 z-10 flex items-center justify-center rounded bg-black/5 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Open feature info for ${featureConfig.label}`}
        >
          <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
            Included
          </span>
        </button>
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
