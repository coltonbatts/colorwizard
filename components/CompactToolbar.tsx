'use client'

import { Palette } from '@/lib/types/palette'
import { CalibrationData } from '@/lib/calibration'
import { CanvasSettings } from '@/lib/types/canvas'
import { TabType } from './CollapsibleSidebar'
import { useIsMobile } from '@/hooks/useMediaQuery'
import ArtistLabToggle from './workbench/ArtistLabToggle'

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
  artistMode?: boolean
  onArtistModeChange?: (artist: boolean) => void
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
  onResetView,
  valueModeEnabled,
  onToggleValueMode,
  artistMode = true,
  onArtistModeChange,
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
    <div className="compact-toolbar" aria-label="Canvas command bar">
      <button type="button" onClick={onGoHome} className="command-text">Open</button>
      <span className="command-rule" aria-hidden="true" />
      <button type="button" onClick={onResetView} className="command-text">
        <FitIcon /> Fit
      </button>
      <button
        type="button"
        onClick={onToggleValueMode}
        className={`command-text ${valueModeEnabled ? 'active' : ''}`}
        aria-pressed={valueModeEnabled}
      >
        <ValueIcon /> Value
      </button>

      <details className="command-menu">
        <summary>View & settings</summary>
        <div className="command-menu-surface">
          <button type="button" onClick={onToggleRulerGrid} disabled={!calibration} aria-pressed={rulerGridEnabled}>
            Grid {rulerGridEnabled ? 'on' : 'off'}
          </button>
          <button type="button" onClick={onToggleMeasure} disabled={!calibration} aria-pressed={measureMode}>
            Measure {measureMode ? 'on' : 'off'}
          </button>
          <button type="button" onClick={onOpenCalibration}>
            {calibration ? 'Edit calibration' : 'Calibrate canvas'}
          </button>
          {calibration && <button type="button" onClick={onResetCalibration}>Reset calibration</button>}
          <button type="button" onClick={onOpenCanvasSettings}>Canvas settings</button>
          <label htmlFor="command-palette">Palette</label>
          <select id="command-palette" value={activePalette.id} onChange={(event) => onSelectPalette(event.target.value)}>
            {palettes.map((palette) => <option key={palette.id} value={palette.id}>{palette.name}</option>)}
          </select>
          <button type="button" onClick={onOpenPaletteManager}>Manage palettes</button>
          {onArtistModeChange && (
            <div className="command-mode-row">
              <span>Interface</span>
              <ArtistLabToggle artistMode={artistMode} onArtistModeChange={onArtistModeChange} />
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
