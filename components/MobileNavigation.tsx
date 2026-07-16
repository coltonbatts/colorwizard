'use client'

import { TabType } from './CollapsibleSidebar'
import OverlaySurface from '@/components/ui/Overlay'
import {
  DeckWorkbenchIcon,
  LibraryWorkbenchIcon,
  MixWorkbenchIcon,
  ReferenceWorkbenchIcon,
  SampleWorkbenchIcon,
  StructureWorkbenchIcon,
  SurfaceWorkbenchIcon,
  ThreadsWorkbenchIcon,
  StitchWorkbenchIcon,
} from './workbenchIcons'

interface MobileNavigationProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  onOpenCanvasSettings?: () => void
  onOpenCalibration?: () => void
}

const primary = [
  { id: 'sample', label: 'Sample', icon: <SampleWorkbenchIcon /> },
  { id: 'mix', label: 'Mix', icon: <MixWorkbenchIcon /> },
  { id: 'matches', label: 'Threads', icon: <ThreadsWorkbenchIcon /> },
  { id: 'stitch', label: 'Stitch', icon: <StitchWorkbenchIcon /> },
  { id: 'deck', label: 'Saved', icon: <DeckWorkbenchIcon /> },
] as const

const tools = [
  { id: 'library', label: 'Library', icon: <LibraryWorkbenchIcon /> },
  { id: 'reference', label: 'Reference', icon: <ReferenceWorkbenchIcon /> },
  { id: 'structure', label: 'Structure', icon: <StructureWorkbenchIcon /> },
  { id: 'surface', label: 'Surface', icon: <SurfaceWorkbenchIcon /> },
] as const

export default function MobileNavigation({
  isOpen,
  onOpenChange,
  activeTab,
  onTabChange,
  onOpenCanvasSettings,
  onOpenCalibration,
}: MobileNavigationProps) {
  const select = (tab: TabType) => { onTabChange(tab); onOpenChange(false) }
  const action = (callback: () => void) => { callback(); onOpenChange(false) }

  return (
    <OverlaySurface
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      preset="drawer"
      ariaLabel="Workbench navigation"
      rootClassName="fixed inset-0 z-[80]"
      backdropClassName="mobile-nav-backdrop"
      panelClassName="mobile-nav-drawer safe-area-bottom"
    >
      <header className="mobile-nav-header safe-area-top">
        <strong>ColorWizard</strong>
        <button type="button" onClick={() => onOpenChange(false)} className="mobile-nav-close" aria-label="Close navigation">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </header>

      <nav className="mobile-nav-items" aria-label="Primary">
        {primary.map((item) => (
          <button key={item.id} type="button" onClick={() => select(item.id)} className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`} aria-current={activeTab === item.id ? 'page' : undefined}>
            <span className="mobile-nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <details className="mobile-tools-group">
        <summary>Tools</summary>
        <div>
          {tools.map((item) => (
            <button key={item.id} type="button" onClick={() => select(item.id)} className={activeTab === item.id ? 'active' : ''}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
          {onOpenCanvasSettings && <button type="button" onClick={() => action(onOpenCanvasSettings)}>Canvas settings</button>}
          {onOpenCalibration && <button type="button" onClick={() => action(onOpenCalibration)}>Calibration</button>}
        </div>
      </details>
    </OverlaySurface>
  )
}
