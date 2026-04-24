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
} from './workbenchIcons'

interface ModeRailItem {
  id: Exclude<TabType, 'deck'>
  label: string
  hint: string
  icon: JSX.Element
}

interface WorkbenchModeRailProps {
  activeMode: Exclude<TabType, 'deck'>
  onModeChange: (mode: Exclude<TabType, 'deck'>) => void
  onOpenDeck: () => void
}

const coreModes: ModeRailItem[] = [
  {
    id: 'sample',
    label: 'Sample',
    hint: 'Inspect sampled color',
    icon: <SampleWorkbenchIcon />,
  },
  {
    id: 'matches',
    label: 'Threads',
    hint: 'Compare DMC matches',
    icon: <ThreadsWorkbenchIcon />,
  },
]

const studioModes: ModeRailItem[] = [
  {
    id: 'mix',
    label: 'Mix',
    hint: 'Explore harmonies and mixing',
    icon: <MixWorkbenchIcon />,
  },
  {
    id: 'library',
    label: 'Library',
    hint: 'Browse paint catalog',
    icon: <LibraryWorkbenchIcon />,
  },
  {
    id: 'reference',
    label: 'Reference',
    hint: 'Overlay reference image',
    icon: <ReferenceWorkbenchIcon />,
  },
  {
    id: 'structure',
    label: 'Structure',
    hint: 'Guides and grid',
    icon: <StructureWorkbenchIcon />,
  },
  {
    id: 'surface',
    label: 'Surface',
    hint: 'Manage painting surface',
    icon: <SurfaceWorkbenchIcon />,
  },
]

export default function WorkbenchModeRail({
  activeMode,
  onModeChange,
  onOpenDeck,
}: WorkbenchModeRailProps) {
  return (
    <aside className="workbench-mode-rail hidden md:flex" aria-label="Workspace modes">
      <div className="workbench-mode-section">
        <span className="workbench-mode-label">Core</span>
        {coreModes.map((mode) => {
          const active = activeMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onModeChange(mode.id)}
              className={`workbench-mode-btn tooltip-wrapper ${active ? 'active' : ''}`}
              aria-pressed={active}
              aria-label={`${mode.label}: ${mode.hint}`}
              data-tooltip={`${mode.label} · ${mode.hint}`}
              title={`${mode.label} · ${mode.hint}`}
            >
              <span className="workbench-mode-icon" aria-hidden="true">
                {mode.icon}
              </span>
            </button>
          )
        })}
      </div>

      <div className="workbench-mode-section workbench-mode-section-tools">
        <span className="workbench-mode-label">Tools</span>
        {studioModes.map((mode) => {
          const active = activeMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onModeChange(mode.id)}
              className={`workbench-mode-btn tooltip-wrapper ${active ? 'active' : ''}`}
              aria-pressed={active}
              aria-label={`${mode.label}: ${mode.hint}`}
              data-tooltip={`${mode.label} · ${mode.hint}`}
              title={`${mode.label} · ${mode.hint}`}
            >
              <span className="workbench-mode-icon" aria-hidden="true">
                {mode.icon}
              </span>
            </button>
          )
        })}
      </div>

      <div className="workbench-mode-section workbench-mode-section-bottom">
        <span className="workbench-mode-label">Save</span>
        <button
          type="button"
          onClick={onOpenDeck}
          className="workbench-mode-btn utility tooltip-wrapper"
          aria-label="Deck: Saved card deck"
          data-tooltip="Deck · Saved card deck"
          title="Deck · Saved card deck"
        >
          <span className="workbench-mode-icon" aria-hidden="true">
            <DeckWorkbenchIcon />
          </span>
        </button>
      </div>
    </aside>
  )
}
