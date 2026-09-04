'use client'

import { useEffect, useState } from 'react'
import SampleInspector, { type InspectorDisclosure } from '@/components/workbench/SampleInspector'
import type { SampleReadoutColor } from '@/lib/hooks/useSampleReadout'
import type { Palette } from '@/lib/types/palette'
import type { PinnedColor } from '@/lib/types/pinnedColor'

interface MobileDashboardProps {
  sampledColor: SampleReadoutColor
  activePalette: Palette
  onPin: (newPin: PinnedColor) => void
  isPinned?: boolean
  onOpenThreads?: () => void
  onChoosePaints?: () => void
  onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
  forceCorePalette?: boolean
  simpleMode: boolean
  valueModeEnabled: boolean
  valueModeSteps: 5 | 7 | 9 | 11
}

const NEXT_STATE: Record<InspectorDisclosure, InspectorDisclosure> = {
  collapsed: 'medium',
  medium: 'expanded',
  expanded: 'collapsed',
}

export default function MobileDashboard({
  sampledColor,
  activePalette,
  onPin,
  isPinned = false,
  onOpenThreads,
  onChoosePaints,
  onColorSelect,
  forceCorePalette = false,
  simpleMode,
  valueModeEnabled,
  valueModeSteps,
}: MobileDashboardProps) {
  const [sheetState, setSheetState] = useState<InspectorDisclosure>('collapsed')

  useEffect(() => {
    setSheetState(sampledColor ? 'medium' : 'collapsed')
  }, [sampledColor])

  const nextLabel = sheetState === 'collapsed'
    ? 'Show Result'
    : sheetState === 'medium'
      ? 'More Guidance'
      : 'Collapse Result'

  return (
    <section className="mobile-result-sheet" data-sheet-state={sheetState} data-testid="mobile-result-sheet" aria-label="Sample result">
      <button
        type="button"
        className="mobile-sheet-toggle"
        onClick={() => setSheetState(NEXT_STATE[sheetState])}
        aria-label={`${nextLabel}. Current result sheet state: ${sheetState}.`}
        aria-expanded={sheetState !== 'collapsed'}
        aria-controls="mobile-sample-inspector"
      >
        <span aria-hidden="true" />
        <strong>{nextLabel}</strong>
      </button>

      <div id="mobile-sample-inspector" className="mobile-sample-inspector-frame">
        <SampleInspector
          sampledColor={sampledColor}
          activePalette={activePalette}
          onPin={onPin}
          isPinned={isPinned}
          simpleMode={simpleMode}
          valueModeEnabled={valueModeEnabled}
          valueModeSteps={valueModeSteps}
          presentation="mobile"
          disclosure={sheetState}
          forceCorePalette={forceCorePalette}
          onOpenThreads={onOpenThreads}
          onChoosePaints={onChoosePaints}
          onColorSelect={onColorSelect}
        />
      </div>
    </section>
  )
}
