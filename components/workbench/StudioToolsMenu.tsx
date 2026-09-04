'use client'

import { useRef, type MouseEvent, type ReactNode } from 'react'
import OverlaySurface from '@/components/ui/Overlay'
import type { TabType } from '@/components/CollapsibleSidebar'
import {
  DeckWorkbenchIcon,
  LibraryWorkbenchIcon,
  ReferenceWorkbenchIcon,
  StructureWorkbenchIcon,
  SurfaceWorkbenchIcon,
  ThreadsWorkbenchIcon,
  StitchWorkbenchIcon,
} from '@/components/workbenchIcons'

export type StudioView = Exclude<TabType, 'sample' | 'mix'>
type WorkbenchView = Exclude<TabType, 'mix'>

interface StudioToolsMenuProps {
  variant: 'desktop' | 'mobile'
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  activeView: WorkbenchView
  onViewChange: (view: StudioView) => void
  onReturnToPainter: () => void
  onOpenPaletteManager: () => void
  onOpenCanvasSettings: () => void
  onOpenCalibration: () => void
  onOpenReferencePreview: () => void
  onClearWorkspace: () => void
  artistMode: boolean
  onArtistModeChange: (artistMode: boolean) => void
}

const studioItems: ReadonlyArray<{ id: StudioView; label: string; description: string; icon: ReactNode }> = [
  { id: 'library', label: 'Paint Library', description: 'Choose the paints available to recipes.', icon: <LibraryWorkbenchIcon /> },
  { id: 'deck', label: 'Saved Colors', description: 'Review saved samples and color cards.', icon: <DeckWorkbenchIcon /> },
  { id: 'reference', label: 'Reference Overlay', description: 'Place and align a tracing reference.', icon: <ReferenceWorkbenchIcon /> },
  { id: 'structure', label: 'Structure & Grid', description: 'Configure drawing and measurement guides.', icon: <StructureWorkbenchIcon /> },
  { id: 'surface', label: 'Surface', description: 'Add a canvas or paper texture layer.', icon: <SurfaceWorkbenchIcon /> },
]

const embroideryItems: ReadonlyArray<{ id: StudioView; label: string; description: string; icon: ReactNode }> = [
  { id: 'matches', label: 'Thread Matches', description: 'Find the nearest DMC floss colors.', icon: <ThreadsWorkbenchIcon /> },
  { id: 'stitch', label: 'Stitch Planner', description: 'Build a gridded embroidery pattern.', icon: <StitchWorkbenchIcon /> },
]

function ToolsContent({
  activeView,
  onSelect,
  onReturnToPainter,
  onOpenPaletteManager,
  onOpenCanvasSettings,
  onOpenCalibration,
  onOpenReferencePreview,
  onClearWorkspace,
  artistMode,
  onArtistModeChange,
}: Omit<StudioToolsMenuProps, 'variant' | 'isOpen' | 'onOpenChange' | 'onViewChange'> & {
  onSelect: (view: StudioView, event?: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <div className="studio-tools-content">
      {activeView !== 'sample' && (
        <button type="button" className="studio-tools-return" onClick={onReturnToPainter}>
          <span aria-hidden="true">←</span> Return to Painter
        </button>
      )}
      <section aria-labelledby="studio-tools-heading">
        <div className="studio-tools-section-heading">
          <span>01</span>
          <div><h2 id="studio-tools-heading">Studio Tools</h2><p>Supporting painter workflows</p></div>
        </div>
        <div className="studio-tools-list">
          {studioItems.map((item) => (
            <button key={item.id} type="button" onClick={(event) => onSelect(item.id, event)} className={activeView === item.id ? 'active' : ''} aria-current={activeView === item.id ? 'page' : undefined}>
              <span aria-hidden="true">{item.icon}</span>
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          ))}
          <button type="button" onClick={onOpenPaletteManager}>
            <span aria-hidden="true"><LibraryWorkbenchIcon /></span>
            <span><strong>Palette Manager</strong><small>Create and organize saved palettes.</small></span>
          </button>
        </div>
      </section>

      <section aria-labelledby="embroidery-heading">
        <div className="studio-tools-section-heading">
          <span>02</span>
          <div><h2 id="embroidery-heading">Embroidery</h2><p>Thread-first tools</p></div>
        </div>
        <div className="studio-tools-list">
          {embroideryItems.map((item) => (
            <button key={item.id} type="button" onClick={(event) => onSelect(item.id, event)} className={activeView === item.id ? 'active' : ''} aria-current={activeView === item.id ? 'page' : undefined}>
              <span aria-hidden="true">{item.icon}</span>
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </div>
      </section>

      <section className="studio-tools-utilities" aria-label="Workspace settings">
        <button type="button" onClick={onOpenReferencePreview}>Full-screen Reference</button>
        <button type="button" onClick={onOpenCanvasSettings}>Canvas Settings</button>
        <button type="button" onClick={onOpenCalibration}>Calibration & Measurement</button>
        <button type="button" onClick={() => onArtistModeChange(!artistMode)} aria-pressed={!artistMode}>
          {artistMode ? 'Show Lab Metrics' : 'Use Painter Guidance'}
        </button>
        <button type="button" className="danger" onClick={onClearWorkspace}>Clear Workspace</button>
      </section>
    </div>
  )
}

export default function StudioToolsMenu({
  variant,
  isOpen = false,
  onOpenChange,
  activeView,
  onViewChange,
  onReturnToPainter,
  onOpenPaletteManager,
  onOpenCanvasSettings,
  onOpenCalibration,
  onOpenReferencePreview,
  onClearWorkspace,
  artistMode,
  onArtistModeChange,
}: StudioToolsMenuProps) {
  const desktopDetailsRef = useRef<HTMLDetailsElement>(null)
  const close = () => {
    if (variant === 'desktop' && desktopDetailsRef.current) {
      desktopDetailsRef.current.open = false
      desktopDetailsRef.current.querySelector<HTMLElement>(':scope > summary')?.focus()
    }
    onOpenChange?.(false)
  }
  const select = (view: StudioView, event?: MouseEvent<HTMLButtonElement>) => {
    onViewChange(view)
    if (variant === 'mobile') close()
    else {
      const details = event?.currentTarget.closest('details')
      if (details) {
        details.open = false
        details.querySelector<HTMLElement>(':scope > summary')?.focus()
      }
    }
  }

  const content = (
    <ToolsContent
      activeView={activeView}
      onSelect={select}
      onReturnToPainter={() => { onReturnToPainter(); close() }}
      onOpenPaletteManager={() => { onOpenPaletteManager(); close() }}
      onOpenCanvasSettings={() => { onOpenCanvasSettings(); close() }}
      onOpenCalibration={() => { onOpenCalibration(); close() }}
      onOpenReferencePreview={() => { onOpenReferencePreview(); close() }}
      onClearWorkspace={() => { onClearWorkspace(); close() }}
      artistMode={artistMode}
      onArtistModeChange={onArtistModeChange}
    />
  )

  if (variant === 'desktop') {
    return (
      <details ref={desktopDetailsRef} className="studio-tools-popover">
        <summary>Studio Tools <span aria-hidden="true">+</span></summary>
        <div className="studio-tools-popover-surface">{content}</div>
      </details>
    )
  }

  return (
    <OverlaySurface
      isOpen={isOpen}
      onClose={close}
      preset="drawer"
      ariaLabel="Studio tools"
      rootClassName="fixed inset-0 z-[80]"
      backdropClassName="mobile-nav-backdrop"
      panelClassName="studio-tools-drawer safe-area-bottom"
    >
      <header className="studio-tools-drawer-header safe-area-top">
        <div><span>ColorWizard</span><strong>Studio Tools</strong></div>
        <button type="button" onClick={close} aria-label="Close Studio Tools">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </header>
      {content}
    </OverlaySurface>
  )
}
