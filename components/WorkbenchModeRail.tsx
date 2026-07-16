'use client'

import { type TabType } from '@/components/CollapsibleSidebar'
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

interface WorkbenchModeRailProps {
  activeMode: Exclude<TabType, 'deck'>
  onModeChange: (mode: Exclude<TabType, 'deck'>) => void
  onOpenDeck: () => void
}

const primaryModes = [
  { id: 'sample', label: 'Sample', icon: <SampleWorkbenchIcon /> },
  { id: 'mix', label: 'Mix', icon: <MixWorkbenchIcon /> },
  { id: 'matches', label: 'Threads', icon: <ThreadsWorkbenchIcon /> },
  { id: 'stitch', label: 'Stitch', icon: <StitchWorkbenchIcon /> },
] as const

const toolModes = [
  { id: 'library', label: 'Library', icon: <LibraryWorkbenchIcon /> },
  { id: 'reference', label: 'Reference', icon: <ReferenceWorkbenchIcon /> },
  { id: 'structure', label: 'Structure', icon: <StructureWorkbenchIcon /> },
  { id: 'surface', label: 'Surface', icon: <SurfaceWorkbenchIcon /> },
] as const

export default function WorkbenchModeRail({
  activeMode,
  onModeChange,
  onOpenDeck,
}: WorkbenchModeRailProps) {
  const toolActive = toolModes.some((mode) => mode.id === activeMode)

  return (
    <nav className="workbench-mode-rail hidden md:flex" aria-label="Workbench">
      <div className="workbench-mode-primary">
        {primaryModes.map((mode) => {
          const active = activeMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onModeChange(mode.id)}
              className={`workbench-mode-btn ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="workbench-mode-icon" aria-hidden="true">{mode.icon}</span>
              <span className="workbench-mode-name">{mode.label}</span>
            </button>
          )
        })}
      </div>

      <details className="workbench-tools-menu">
        <summary className={`workbench-mode-btn ${toolActive ? 'active' : ''}`}>
          <span className="workbench-mode-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
              <circle cx="8" cy="7" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="11" cy="17" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="workbench-mode-name">Tools</span>
        </summary>
        <div className="workbench-tools-surface" role="group" aria-label="Studio tools">
          {toolModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onModeChange(mode.id)}
              className={activeMode === mode.id ? 'active' : ''}
              aria-current={activeMode === mode.id ? 'page' : undefined}
            >
              <span aria-hidden="true">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
          <button type="button" onClick={onOpenDeck}>
            <span aria-hidden="true"><DeckWorkbenchIcon /></span>
            Saved deck
          </button>
        </div>
      </details>
    </nav>
  )
}
