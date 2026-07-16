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
      <div className="group relative rounded-lg">
        {children}
        <button
          type="button"
          onClick={() => setShowUpgradePrompt(true)}
          className="absolute inset-0 z-10 flex items-end justify-center rounded-lg bg-transparent p-3 transition-[background-color] hover:bg-paper-shell/45 focus-visible:bg-paper-shell/45"
          aria-label={`Open feature info for ${featureConfig.label}`}
        >
          <span className="rounded-md border border-ink bg-ink px-3 py-1.5 text-xs font-semibold text-paper-elevated opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            Requires License
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
