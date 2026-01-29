/**
 * Pro Feature Section Component
 * Shows a feature with upgrade call-to-action if user doesn't have access
 */

'use client'

import { useState } from 'react'
import { type FeatureName, FEATURES } from '@/lib/featureFlags'
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import UpgradePrompt from './UpgradePrompt'

interface ProFeatureSectionProps {
  feature: FeatureName
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
}

export default function ProFeatureSection({
  feature,
  title,
  children,
  icon,
}: ProFeatureSectionProps) {
  const {
    hasAccess,
    showUpgradePrompt,
    setShowUpgradePrompt,
    handleUpgradeClick,
    isUpgrading,
  } = useFeatureAccess(feature)

  const featureConfig = FEATURES[feature]

  if (!hasAccess) {
    return (
      <>
        <div className="relative">
          <div className="opacity-40 pointer-events-none blur-sm">
            {children}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-white/80 to-white/90">
            <div className="text-4xl">🔒</div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 max-w-xs text-center">
              {featureConfig.description}
            </p>
            <button
              onClick={() => setShowUpgradePrompt(true)}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Unlock Pro
            </button>
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

  return <>{children}</>
}
