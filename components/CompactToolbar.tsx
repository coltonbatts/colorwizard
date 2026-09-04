'use client'

import type { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { WordmarkCompact } from '@/components/Wordmark'

interface CompactToolbarProps {
  hasImage: boolean
  onReplacePhoto: () => void
  onResetView?: () => void
  valueModeEnabled: boolean
  onToggleValueMode: () => void
  studioTools?: ReactNode
}

const FitIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
)

const ValueIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" fillOpacity=".2" />
  </svg>
)

export default function CompactToolbar({
  hasImage,
  onReplacePhoto,
  onResetView,
  valueModeEnabled,
  onToggleValueMode,
  studioTools,
}: CompactToolbarProps) {
  const isMobile = useIsMobile()

  if (!hasImage) return null

  if (isMobile) {
    return (
      <div className="mobile-stage-controls" aria-label="Canvas view controls">
        <button type="button" onClick={onResetView} aria-label="Fit image to canvas" title="Fit image">
          <FitIcon />
        </button>
        <button
          type="button"
          onClick={onToggleValueMode}
          className={valueModeEnabled ? 'active' : ''}
          aria-pressed={valueModeEnabled}
          aria-label="Toggle value view"
          title="Value view"
        >
          <ValueIcon />
        </button>
      </div>
    )
  }

  return (
    <div className="compact-toolbar compact-toolbar--painter" aria-label="Canvas command bar">
      <WordmarkCompact className="compact-toolbar-wordmark" />
      <span className="command-rule" aria-hidden="true" />
      <button type="button" onClick={onReplacePhoto} className="command-text">Replace Photo</button>
      <button type="button" onClick={onResetView} className="command-icon-text"><FitIcon />Fit</button>
      <button type="button" onClick={onToggleValueMode} className={`command-icon-text ${valueModeEnabled ? 'active' : ''}`} aria-pressed={valueModeEnabled}>
        <ValueIcon />Value View
      </button>
      <span className="compact-toolbar-spacer" />
      {studioTools}
    </div>
  )
}
