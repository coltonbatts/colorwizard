'use client'

import type { ReactNode, Ref } from 'react'

interface DesktopWorkbenchProps {
  hasImage: boolean
  layoutMode: 'wide' | 'medium' | 'narrow'
  frameRef?: Ref<HTMLDivElement>
  canvasFrameRef?: Ref<HTMLDivElement>
  toolbar?: ReactNode
  highlightControls?: ReactNode
  canvas: ReactNode
  inspector?: ReactNode
}

export default function DesktopWorkbench({
  hasImage,
  layoutMode,
  frameRef,
  canvasFrameRef,
  toolbar,
  highlightControls,
  canvas,
  inspector,
}: DesktopWorkbenchProps) {
  const shellClass = hasImage
    ? `painter-desktop-shell--${layoutMode}`
    : 'painter-desktop-shell--empty'
  const canvasInsetClass = hasImage
    ? layoutMode === 'wide'
      ? 'px-5 pb-5 pt-[6.75rem]'
      : layoutMode === 'medium'
        ? 'px-4 pb-4 pt-[6.25rem]'
        : 'px-3 pb-3 pt-[5.75rem]'
    : 'p-0'

  return (
    <div ref={frameRef} className={`painter-desktop-shell relative flex-1 min-h-0 min-w-0 overflow-hidden ${shellClass}`} data-layout={layoutMode}>
      <section className="workbench-desktop-stage relative flex min-h-0 min-w-0 flex-col" aria-label="Reference canvas">
        {hasImage && toolbar}
        {hasImage && highlightControls}
        <div className={`workbench-desktop-canvas-inset flex flex-1 min-h-0 min-w-0 flex-col ${canvasInsetClass}`}>
          <div className="relative flex-1 min-h-0" ref={canvasFrameRef}>
            {hasImage && (
              <div className="workbench-stage-reticle" aria-hidden="true">
                <span className="reticle-nw" /><span className="reticle-ne" /><span className="reticle-sw" /><span className="reticle-se" />
              </div>
            )}
            {canvas}
          </div>
        </div>
      </section>
      {hasImage && <div className="workbench-desktop-inspector relative z-40 flex min-h-0 min-w-0">{inspector}</div>}
    </div>
  )
}
