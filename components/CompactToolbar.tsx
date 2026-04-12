'use client'

import type { ReactNode } from 'react'
import { Palette } from '@/lib/types/palette'
import { CalibrationData } from '@/lib/calibration'
import { CanvasSettings } from '@/lib/types/canvas'
import { TabType } from './CollapsibleSidebar'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { WordmarkCompact } from './Wordmark'
import {
  DeckWorkbenchIcon,
  SampleWorkbenchIcon,
  ThreadsWorkbenchIcon,
} from './workbenchIcons'

interface CompactToolbarProps {
  calibration: CalibrationData | null
  onOpenCalibration: () => void
  onResetCalibration: () => void
  onGoHome: () => void
  rulerGridEnabled: boolean
  onToggleRulerGrid: () => void
  canvasSettings: CanvasSettings
  onOpenCanvasSettings: () => void
  measureMode: boolean
  onToggleMeasure: () => void
  palettes: Palette[]
  activePalette: Palette
  onSelectPalette: (id: string) => void
  onOpenPaletteManager: () => void
  hasImage: boolean
  activeTab?: TabType
  onTabChange?: (tab: TabType) => void
  onResetView?: () => void
  valueModeEnabled: boolean
  valueModeSteps: 5 | 7 | 9 | 11
  onToggleValueMode: () => void
  onValueModeStepsChange: (steps: 5 | 7 | 9 | 11) => void
}

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 3v18" />
  </svg>
)

const ValueIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2v20" />
    <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" fillOpacity="0.22" />
  </svg>
)

const MeasureIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4" />
    <path d="M12 18v4" />
    <path d="M2 12h4" />
    <path d="M18 12h4" />
  </svg>
)

const FitIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
)

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
)

const SlidersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 21v-7" />
    <path d="M4 10V3" />
    <path d="M12 21v-9" />
    <path d="M12 8V3" />
    <path d="M20 21v-5" />
    <path d="M20 12V3" />
    <path d="M2 14h4" />
    <path d="M10 10h4" />
    <path d="M18 14h4" />
  </svg>
)

const BeakerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2v7.31" />
    <path d="M14 9.3V2" />
    <path d="M8.5 2h7" />
    <path d="M14 9.3 19.74 19a2 2 0 0 1-1.72 3H5.98a2 2 0 0 1-1.72-3L10 9.3" />
  </svg>
)

const PaletteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a1 1 0 0 1 0-20a10 9 0 0 1 10 9a5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
)

function CommandButton({
  label,
  icon,
  active = false,
  tone = 'signal',
  disabled = false,
  onClick,
}: {
  label: string
  icon: ReactNode
  active?: boolean
  tone?: 'signal' | 'subsignal'
  disabled?: boolean
  onClick?: () => void
}) {
  const activeClasses =
    tone === 'subsignal'
      ? 'border-subsignal bg-subsignal-muted text-subsignal'
      : 'border-signal bg-signal-muted text-signal'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
        active
          ? activeClasses
          : 'border-ink-hairline bg-paper text-ink-secondary hover:bg-paper-recessed hover:text-ink'
      } ${disabled ? 'cursor-not-allowed opacity-35 hover:bg-paper hover:text-ink-secondary' : ''}`}
    >
      <span className="inline-flex items-center justify-center">{icon}</span>
    </button>
  )
}

export default function CompactToolbar({
  calibration,
  onOpenCalibration,
  onResetCalibration,
  onGoHome,
  rulerGridEnabled,
  onToggleRulerGrid,
  measureMode,
  onToggleMeasure,
  palettes,
  activePalette,
  onSelectPalette,
  onOpenPaletteManager,
  onOpenCanvasSettings,
  hasImage,
  activeTab,
  onTabChange,
  onResetView,
  valueModeEnabled,
  onToggleValueMode,
}: CompactToolbarProps) {
  const isMobile = useIsMobile()
  const mobileTabAction =
    activeTab === 'sample'
      ? { nextTab: 'matches' as const, label: 'Threads', icon: <ThreadsWorkbenchIcon /> }
      : activeTab === 'matches'
        ? { nextTab: 'deck' as const, label: 'Deck', icon: <DeckWorkbenchIcon /> }
        : { nextTab: 'sample' as const, label: 'Sample', icon: <SampleWorkbenchIcon /> }

  if (isMobile) {
    if (!hasImage) return null

    return (
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[60] safe-area-bottom">
        <div className="pointer-events-auto mx-auto mb-2 flex w-fit items-center gap-0.5 rounded-[16px] border border-ink-hairline bg-paper-elevated/95 p-1 shadow-[0_14px_28px_rgba(26,26,26,0.12)] backdrop-blur-md">
          <button
            type="button"
            onClick={onResetView}
            title="Fit"
            aria-label="Snap to fit"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-paper hover:text-signal"
          >
            <FitIcon />
          </button>

          <button
            type="button"
            onClick={onToggleValueMode}
            title="Value"
            aria-label="Toggle value mode"
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              valueModeEnabled ? 'text-signal' : 'text-ink-secondary'
            }`}
          >
            <ValueIcon />
          </button>

          <button
            type="button"
            onClick={onToggleRulerGrid}
            disabled={!calibration}
            title="Grid"
            aria-label="Toggle grid"
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              rulerGridEnabled ? 'text-subsignal' : 'text-ink-secondary'
            } ${!calibration ? 'opacity-30' : ''}`}
          >
            <GridIcon />
          </button>

          <button
            type="button"
            onClick={onToggleMeasure}
            disabled={!calibration}
            title="Measure"
            aria-label="Toggle measure"
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              measureMode ? 'text-signal' : 'text-ink-secondary'
            } ${!calibration ? 'opacity-30' : ''}`}
          >
            <MeasureIcon />
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange?.(mobileTabAction.nextTab)
            }}
            title={mobileTabAction.label}
            aria-label={`Open ${mobileTabAction.label.toLowerCase()}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-paper hover:text-subsignal"
          >
            {mobileTabAction.icon}
          </button>
        </div>
      </div>
    )
  }

  if (!hasImage) {
    return (
      <div className="paper-panel-raised flex items-center justify-center px-5 py-4">
        <WordmarkCompact className="text-xl" />
      </div>
    )
  }

  return (
    <div className="compact-toolbar paper-panel-raised flex flex-wrap items-center gap-2 overflow-visible px-3 py-2">
      <div className="workbench-toolbar-group shrink-0">
        <button
          type="button"
          onClick={onGoHome}
          title="New image"
          aria-label="New image"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-hairline bg-paper text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-ink"
        >
          <HomeIcon />
        </button>
        <CommandButton label="Fit" icon={<FitIcon />} onClick={onResetView} />
        <CommandButton label="Value mode" icon={<ValueIcon />} active={valueModeEnabled} onClick={onToggleValueMode} />
      </div>

      <div className="workbench-toolbar-group shrink-0">
        <CommandButton
          label="Grid"
          icon={<GridIcon />}
          active={Boolean(calibration && rulerGridEnabled)}
          tone="subsignal"
          disabled={!calibration}
          onClick={onToggleRulerGrid}
        />
        <CommandButton
          label="Measure"
          icon={<MeasureIcon />}
          active={Boolean(calibration && measureMode)}
          disabled={!calibration}
          onClick={onToggleMeasure}
        />
        <CommandButton
          label={calibration ? 'Calibration' : 'Calibrate'}
          icon={<BeakerIcon />}
          active={Boolean(calibration)}
          tone="subsignal"
          onClick={onOpenCalibration}
        />
        {calibration && (
          <button
            type="button"
            onClick={onResetCalibration}
            title="Reset calibration"
            className="inline-flex h-9 items-center rounded-lg border border-ink-hairline bg-paper px-3 text-[10px] font-black uppercase tracking-[0.16em] text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-ink"
          >
            Reset
          </button>
        )}
        <CommandButton label="Canvas settings" icon={<SlidersIcon />} onClick={onOpenCanvasSettings} />
      </div>

      <div className="workbench-toolbar-group ml-auto shrink-0">
        <select
          value={activePalette.id}
          onChange={(e) => onSelectPalette(e.target.value)}
          className="h-9 min-w-[10rem] rounded-lg border border-ink-hairline bg-paper px-3 text-sm font-semibold text-ink outline-none transition-colors focus:border-ink-muted"
          aria-label="Select active palette"
        >
          {palettes.map((palette) => (
            <option key={palette.id} value={palette.id}>
              {palette.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onOpenPaletteManager}
          title="Manage palettes"
          aria-label="Manage palettes"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-hairline bg-paper text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-ink"
        >
          <PaletteIcon />
        </button>
      </div>
    </div>
  )
}
