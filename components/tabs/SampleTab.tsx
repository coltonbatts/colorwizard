'use client'

import DesktopSampleHud from '@/components/workbench/DesktopSampleHud'
import type { PinnedColor } from '@/lib/types/pinnedColor'
import type { Palette } from '@/lib/types/palette'

interface SampleTabProps {
  sampledColor: {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
    valueMetadata?: { y: number; step: number; range: [number, number]; percentile: number }
  } | null
  onPin: (newPin: PinnedColor) => void
  isPinned: boolean
  lastSampleTime?: number
  activePalette: Palette
  simpleMode: boolean
  valueModeEnabled: boolean
  valueModeSteps: 5 | 7 | 9 | 11
  onAddToSession?: (color: { hex: string; rgb: { r: number; g: number; b: number } }) => void
  onSwitchToMatches?: () => void
  onSwitchToMix?: () => void
  dismissPreviewSignal?: number
  suppressPreviewOverlay?: boolean
}

/** Canonical sample inspector used by fallback and narrow workbench layouts. */
export default function SampleTab({
  sampledColor,
  onPin,
  isPinned,
  activePalette,
  simpleMode,
  valueModeEnabled,
  valueModeSteps,
  onAddToSession,
  onSwitchToMatches,
  onSwitchToMix,
}: SampleTabProps) {
  return (
    <DesktopSampleHud
      sampledColor={sampledColor}
      activePalette={activePalette}
      onPin={onPin}
      isPinned={isPinned}
      simpleMode={simpleMode}
      valueModeEnabled={valueModeEnabled}
      valueModeSteps={valueModeSteps}
      layoutMode="narrow"
      onAddToSession={onAddToSession}
      onOpenMix={onSwitchToMix}
      onOpenThreads={onSwitchToMatches}
    />
  )
}
