'use client'

import type { Ref, ReactNode } from 'react'

interface MobileCoreShellProps {
  compactMode: boolean
  hasImage: boolean
  isSampleLayout: boolean
  header: ReactNode
  toolbar: ReactNode
  canvas: ReactNode
  canvasFrameRef?: Ref<HTMLDivElement>
  sampleDashboard?: ReactNode
  controlsPanel?: ReactNode
  navigation: ReactNode
}

export default function MobileCoreShell({
  compactMode,
  hasImage,
  isSampleLayout,
  header,
  toolbar,
  canvas,
  canvasFrameRef,
  sampleDashboard,
  controlsPanel,
  navigation,
}: MobileCoreShellProps) {
  const previewClassName = [
    'relative flex-1 flex flex-col min-h-0 min-w-0 mobile-preview-area',
    hasImage ? 'workbench-stage-column' : '',
    isSampleLayout && hasImage ? 'mobile-preview-area--sample-loaded' : '',
    compactMode ? 'p-0 md:p-2' : 'p-0 md:p-3',
  ].filter(Boolean).join(' ')

  const canvasFrameClassName = 'flex-1 min-h-0 relative mobile-canvas-frame'

  return (
    <div className={`mobile-core-shell ${hasImage ? 'mobile-core-shell--loaded' : 'mobile-core-shell--empty'}`}>
      {header}

      <div className={previewClassName}>
        {toolbar}

        <div className={canvasFrameClassName} ref={canvasFrameRef} data-testid="mobile-canvas-stage">
          {canvas}
        </div>

        {sampleDashboard ? <div className="mobile-result-layer">{sampleDashboard}</div> : null}
      </div>

      {controlsPanel}
      {navigation}
    </div>
  )
}
