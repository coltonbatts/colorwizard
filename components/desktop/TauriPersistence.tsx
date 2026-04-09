/**
 * Tauri Persistence Layer - Bridges zustand stores to SQLite on Desktop.
 *
 * When running in Tauri:
 * - On mount: loads persisted data from SQLite into stores
 * - On store changes: debounced save to SQLite
 *
 * When running in browser: no-op, localStorage continues to work as before.
 */
'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { isCalibrationStale, type CalibrationData } from '@/lib/calibration'
import { usePaletteStore } from '@/lib/store/usePaletteStore'
import { usePaintPaletteStore, type PaintPalette } from '@/lib/store/usePaintPaletteStore'
import { useSessionStore } from '@/lib/store/useSessionStore'
import { useCalibrationStore } from '@/lib/store/useCalibrationStore'
import { useCanvasStore } from '@/lib/store/useCanvasStore'
import { useLayoutStore } from '@/lib/store/useLayoutStore'
import { DEFAULT_PALETTE } from '@/lib/types/palette'
import { DEFAULT_CANVAS_SETTINGS, type CanvasSettings } from '@/lib/types/canvas'
import type { PinnedColor } from '@/lib/types/pinnedColor'
import { DEFAULT_VALUE_SCALE_SETTINGS, type ValueScaleSettings } from '@/lib/types/valueScale'
import { isDesktopApp } from '@/lib/desktop/detect'
import {
  initDatabase,
  loadPalettes,
  loadPinnedColors,
  savePalettes,
  savePinnedColors,
  setAppSetting,
  getAppSetting,
  sanitizeDesktopProjectImageSrc,
  updateProject,
} from '@/lib/desktop/tauriClient'

interface TauriPersistenceProps {
  projectId: number | null
  onReady?: (projectId: number) => void
  /** When opening a brand-new project from the library with a file already chosen, seed the canvas once after hydrate. */
  seedReferenceAbsolutePath?: string | null
  onSeedReferenceConsumed?: () => void
  /** When true (e.g. user continued without a working local DB), skip SQLite hydrate/save and avoid IPC spam. */
  persistenceDisabled?: boolean
}

const DEFAULT_SIDEBAR_WIDTH = 360
const DEFAULT_REFERENCE_TRANSFORM = { x: 0, y: 0, scale: 1, rotation: 0 }
const DEFAULT_VIEW_TRANSFORM_STATE = {
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
}
const DEFAULT_CALIBRATION_UI_STATE = {
  rulerGridEnabled: false,
  rulerGridSpacing: 1 as 0.25 | 0.5 | 1 | 2,
  gridOpacity: 0.3,
  measurementLayer: 'reference' as 'reference' | 'painting',
}
const DEFAULT_PAINT_PALETTE_STATE = {
  selectedPaintIds: [] as string[],
  savedPalettes: [] as PaintPalette[],
  activePaletteId: null as string | null,
  isDirty: false,
}

type SurfaceBounds = { x: number; y: number; width: number; height: number }

interface PersistedCanvasState {
  referenceImage: string | null
  surfaceImage: string | null
  surfaceBounds: SurfaceBounds | null
  referenceOpacity: number
  referenceLocked: boolean
  referenceTransform: { x: number; y: number; scale: number; rotation: number }
  valueScaleSettings: ValueScaleSettings
  canvasSettings: CanvasSettings
}

interface PersistedCalibrationState {
  calibration: CalibrationData | null
  rulerGridEnabled: boolean
  rulerGridSpacing: 0.25 | 0.5 | 1 | 2
  gridOpacity: number
  measurementLayer: 'reference' | 'painting'
}

interface PersistedLayoutState {
  sidebarCollapsed: boolean
  compactMode: boolean
  sidebarWidth: number
  simpleMode: boolean
}

interface PersistedPaintPaletteState {
  selectedPaintIds: string[]
  savedPalettes: PaintPalette[]
  activePaletteId: string | null
  isDirty: boolean
}

function projectSettingKey(projectId: number, key: string): string {
  return `project:${projectId}:${key}`
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function sanitizeSurfaceBounds(value: unknown): SurfaceBounds | null {
  if (!value || typeof value !== 'object') return null
  const bounds = value as Partial<SurfaceBounds>
  if (
    typeof bounds.x !== 'number' ||
    typeof bounds.y !== 'number' ||
    typeof bounds.width !== 'number' ||
    typeof bounds.height !== 'number'
  ) {
    return null
  }

  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

function sanitizeCanvasState(value: unknown): PersistedCanvasState {
  const raw = value && typeof value === 'object' ? (value as Partial<PersistedCanvasState>) : {}
  const rawTransform: Partial<PersistedCanvasState['referenceTransform']> =
    raw.referenceTransform && typeof raw.referenceTransform === 'object'
      ? raw.referenceTransform
      : {}
  const rawValueScale: Partial<ValueScaleSettings> =
    raw.valueScaleSettings && typeof raw.valueScaleSettings === 'object'
      ? raw.valueScaleSettings
      : {}
  const rawCanvasSettings: Partial<CanvasSettings> =
    raw.canvasSettings && typeof raw.canvasSettings === 'object'
      ? raw.canvasSettings
      : {}

  return {
    referenceImage: sanitizeDesktopProjectImageSrc(raw.referenceImage ?? null),
    surfaceImage: sanitizeDesktopProjectImageSrc(raw.surfaceImage ?? null),
    surfaceBounds: sanitizeSurfaceBounds(raw.surfaceBounds),
    referenceOpacity: asNumber(raw.referenceOpacity, 1),
    referenceLocked: raw.referenceLocked === true,
    referenceTransform: {
      x: asNumber(rawTransform.x, DEFAULT_REFERENCE_TRANSFORM.x),
      y: asNumber(rawTransform.y, DEFAULT_REFERENCE_TRANSFORM.y),
      scale: asNumber(rawTransform.scale, DEFAULT_REFERENCE_TRANSFORM.scale),
      rotation: asNumber(rawTransform.rotation, DEFAULT_REFERENCE_TRANSFORM.rotation),
    },
    valueScaleSettings: {
      ...DEFAULT_VALUE_SCALE_SETTINGS,
      ...rawValueScale,
      enabled: rawValueScale.enabled === true,
      steps: asNumber(rawValueScale.steps, DEFAULT_VALUE_SCALE_SETTINGS.steps),
      opacity: asNumber(rawValueScale.opacity, DEFAULT_VALUE_SCALE_SETTINGS.opacity),
    },
    canvasSettings: {
      ...DEFAULT_CANVAS_SETTINGS,
      ...rawCanvasSettings,
      enabled: rawCanvasSettings.enabled === true,
      width: asNumber(rawCanvasSettings.width, DEFAULT_CANVAS_SETTINGS.width),
      height: asNumber(rawCanvasSettings.height, DEFAULT_CANVAS_SETTINGS.height),
      unit: rawCanvasSettings.unit === 'cm' ? 'cm' : 'in',
    },
  }
}

function sanitizeCalibrationState(value: unknown): PersistedCalibrationState {
  const raw = value && typeof value === 'object' ? (value as Partial<PersistedCalibrationState>) : {}

  return {
    calibration: raw.calibration ?? null,
    rulerGridEnabled: raw.rulerGridEnabled === true,
    rulerGridSpacing: raw.rulerGridSpacing === 0.25 || raw.rulerGridSpacing === 0.5 || raw.rulerGridSpacing === 2
      ? raw.rulerGridSpacing
      : DEFAULT_CALIBRATION_UI_STATE.rulerGridSpacing,
    gridOpacity: asNumber(raw.gridOpacity, DEFAULT_CALIBRATION_UI_STATE.gridOpacity),
    measurementLayer: raw.measurementLayer === 'painting' ? 'painting' : 'reference',
  }
}

function sanitizeLayoutState(value: unknown): PersistedLayoutState {
  const raw = value && typeof value === 'object' ? (value as Partial<PersistedLayoutState>) : {}

  return {
    sidebarCollapsed: raw.sidebarCollapsed === true,
    compactMode: raw.compactMode === true,
    sidebarWidth: asNumber(raw.sidebarWidth, DEFAULT_SIDEBAR_WIDTH),
    simpleMode: raw.simpleMode !== false,
  }
}

function sanitizePaintPaletteState(value: unknown): PersistedPaintPaletteState {
  const raw = value && typeof value === 'object' ? (value as Partial<PersistedPaintPaletteState>) : {}

  return {
    selectedPaintIds: Array.isArray(raw.selectedPaintIds)
      ? raw.selectedPaintIds.filter((paintId): paintId is string => typeof paintId === 'string')
      : DEFAULT_PAINT_PALETTE_STATE.selectedPaintIds,
    savedPalettes: Array.isArray(raw.savedPalettes)
      ? raw.savedPalettes.filter((palette): palette is PaintPalette => {
          return (
            typeof palette === 'object' &&
            palette !== null &&
            typeof palette.id === 'string' &&
            typeof palette.name === 'string' &&
            Array.isArray(palette.paintIds)
          )
        })
      : DEFAULT_PAINT_PALETTE_STATE.savedPalettes,
    activePaletteId: typeof raw.activePaletteId === 'string' ? raw.activePaletteId : null,
    isDirty: raw.isDirty === true,
  }
}

function sanitizePinnedColors(value: unknown): PinnedColor[] {
  if (!Array.isArray(value)) return []

  return value.filter((color): color is PinnedColor => {
    return (
      typeof color === 'object' &&
      color !== null &&
      typeof color.id === 'string' &&
      typeof color.hex === 'string' &&
      typeof color.label === 'string'
    )
  })
}

/** Reads latest state from stores (not React closures) so lifecycle flushes are never stale. */
function persistDesktopProjectSnapshot(projectId: number): void {
  const palettes = usePaletteStore.getState().palettes
  const pinnedColors = useSessionStore.getState().pinnedColors
  const cal = useCalibrationStore.getState()
  const calibration = cal.calibration
  const rulerGridEnabled = cal.rulerGridEnabled
  const rulerGridSpacing = cal.rulerGridSpacing
  const gridOpacity = cal.gridOpacity
  const measurementLayer = cal.measurementLayer
  const layout = useLayoutStore.getState()
  const sidebarCollapsed = layout.sidebarCollapsed
  const compactMode = layout.compactMode
  const sidebarWidth = layout.sidebarWidth
  const simpleMode = layout.simpleMode
  const c = useCanvasStore.getState()
  const referenceImage = c.referenceImage
  const surfaceImage = c.surfaceImage
  const surfaceBounds = c.surfaceBounds
  const referenceOpacity = c.referenceOpacity
  const referenceLocked = c.referenceLocked
  const referenceTransform = c.referenceTransform
  const valueScaleSettings = c.valueScaleSettings
  const canvasSettings = c.canvasSettings
  const pp = usePaintPaletteStore.getState()
  const selectedPaintIds = pp.selectedPaintIds
  const savedPaintPalettes = pp.savedPalettes
  const activePaintPaletteId = pp.activePaletteId
  const isPaintPaletteDirty = pp.isDirty

  const canvasState: PersistedCanvasState = {
    referenceImage: sanitizeDesktopProjectImageSrc(referenceImage),
    surfaceImage: sanitizeDesktopProjectImageSrc(surfaceImage),
    surfaceBounds,
    referenceOpacity,
    referenceLocked,
    referenceTransform,
    valueScaleSettings,
    canvasSettings,
  }
  const calibrationState: PersistedCalibrationState = {
    calibration,
    rulerGridEnabled,
    rulerGridSpacing,
    gridOpacity,
    measurementLayer,
  }
  const layoutState: PersistedLayoutState = {
    sidebarCollapsed,
    compactMode,
    sidebarWidth,
    simpleMode,
  }
  const paintPaletteState: PersistedPaintPaletteState = {
    selectedPaintIds,
    savedPalettes: savedPaintPalettes,
    activePaletteId: activePaintPaletteId,
    isDirty: isPaintPaletteDirty,
  }

  savePalettes(projectId, palettes).catch((err: unknown) => {
    console.error('[Tauri] Save palettes failed:', err)
  })

  savePinnedColors(projectId, pinnedColors).catch((err: unknown) => {
    console.error('[Tauri] Save pinned colors failed:', err)
  })

  setAppSetting(projectSettingKey(projectId, 'canvas'), JSON.stringify(canvasState)).catch((err: unknown) => {
    console.error('[Tauri] Save canvas state failed:', err)
  })

  setAppSetting(projectSettingKey(projectId, 'calibration'), JSON.stringify(calibrationState)).catch((err: unknown) => {
    console.error('[Tauri] Save calibration failed:', err)
  })

  setAppSetting(projectSettingKey(projectId, 'layout'), JSON.stringify(layoutState)).catch((err: unknown) => {
    console.error('[Tauri] Save layout failed:', err)
  })

  setAppSetting(projectSettingKey(projectId, 'paintPalette'), JSON.stringify(paintPaletteState)).catch((err: unknown) => {
    console.error('[Tauri] Save paint palette state failed:', err)
  })

  updateProject(projectId, undefined, canvasState.referenceImage).catch((err: unknown) => {
    console.error('[Tauri] Failed to update project modified time:', err)
  })
}

async function loadProjectSetting<T>(
  projectId: number,
  key: string,
  sanitize: (value: unknown) => T,
): Promise<T> {
  const raw = await getAppSetting(projectSettingKey(projectId, key))
  if (!raw) return sanitize(undefined)

  try {
    return sanitize(JSON.parse(raw))
  } catch (error) {
    console.error(`[Tauri] Failed to parse ${key}:`, error)
    return sanitize(undefined)
  }
}

export default function TauriPersistence({
  projectId,
  onReady,
  seedReferenceAbsolutePath,
  onSeedReferenceConsumed,
  persistenceDisabled = false,
}: TauriPersistenceProps) {
  const hasInitializedRef = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedProjectIdRef = useRef<number | null>(null)
  /** One-shot path for “Open image” from the library; do not put in hydrate deps (would re-run load when cleared). */
  const pendingSeedPathRef = useRef<string | null>(null)

  const palettes = usePaletteStore((s) => s.palettes)
  const pinnedColors = useSessionStore((s) => s.pinnedColors)
  const calibration = useCalibrationStore((s) => s.calibration)
  const rulerGridEnabled = useCalibrationStore((s) => s.rulerGridEnabled)
  const rulerGridSpacing = useCalibrationStore((s) => s.rulerGridSpacing)
  const gridOpacity = useCalibrationStore((s) => s.gridOpacity)
  const measurementLayer = useCalibrationStore((s) => s.measurementLayer)
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed)
  const compactMode = useLayoutStore((s) => s.compactMode)
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth)
  const simpleMode = useLayoutStore((s) => s.simpleMode)
  const referenceImage = useCanvasStore((s) => s.referenceImage)
  const surfaceImage = useCanvasStore((s) => s.surfaceImage)
  const surfaceBounds = useCanvasStore((s) => s.surfaceBounds)
  const referenceOpacity = useCanvasStore((s) => s.referenceOpacity)
  const referenceLocked = useCanvasStore((s) => s.referenceLocked)
  const referenceTransform = useCanvasStore((s) => s.referenceTransform)
  const valueScaleSettings = useCanvasStore((s) => s.valueScaleSettings)
  const canvasSettings = useCanvasStore((s) => s.canvasSettings)
  const selectedPaintIds = usePaintPaletteStore((s) => s.selectedPaintIds)
  const savedPaintPalettes = usePaintPaletteStore((s) => s.savedPalettes)
  const activePaintPaletteId = usePaintPaletteStore((s) => s.activePaletteId)
  const isPaintPaletteDirty = usePaintPaletteStore((s) => s.isDirty)

  const [hydratedProjectId, setHydratedProjectId] = useState<number | null>(null)

  const persistenceActive = isDesktopApp() && !persistenceDisabled

  useEffect(() => {
    hydratedProjectIdRef.current = hydratedProjectId
  }, [hydratedProjectId])

  useEffect(() => {
    if (seedReferenceAbsolutePath) {
      pendingSeedPathRef.current = seedReferenceAbsolutePath
    }
  }, [seedReferenceAbsolutePath])

  const resetProjectState = useCallback(() => {
    usePaletteStore.setState({ palettes: [DEFAULT_PALETTE] })
    usePaintPaletteStore.getState().resetPersistedState()
    useSessionStore.setState({
      sampledColor: null,
      activeHighlightColor: null,
      pinnedColors: [],
      valueModeEnabled: false,
      lastSampleTime: 0,
    })
    useCalibrationStore.setState({
      calibration: null,
      calibrationStale: false,
      measureMode: false,
      measurePointA: null,
      measurePointB: null,
      measurementLayer: DEFAULT_CALIBRATION_UI_STATE.measurementLayer,
      rulerGridEnabled: DEFAULT_CALIBRATION_UI_STATE.rulerGridEnabled,
      rulerGridSpacing: DEFAULT_CALIBRATION_UI_STATE.rulerGridSpacing,
      gridOpacity: DEFAULT_CALIBRATION_UI_STATE.gridOpacity,
      transformState: DEFAULT_VIEW_TRANSFORM_STATE,
    })
    useLayoutStore.setState({
      sidebarCollapsed: false,
      compactMode: false,
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      simpleMode: true,
    })
    useCanvasStore.setState({
      image: null,
      surfaceImage: null,
      surfaceBounds: null,
      referenceImage: null,
      referenceOpacity: 1,
      referenceLocked: false,
      referenceTransform: DEFAULT_REFERENCE_TRANSFORM,
      valueScaleSettings: DEFAULT_VALUE_SCALE_SETTINGS,
      histogramBins: [],
      valueScaleResult: null,
      breakdownValue: 0,
      transformState: DEFAULT_VIEW_TRANSFORM_STATE,
      canvasSettings: DEFAULT_CANVAS_SETTINGS,
    })
  }, [])

  useEffect(() => {
    if (!persistenceActive || hasInitializedRef.current) return
    hasInitializedRef.current = true

    initDatabase().catch((err) => {
      console.error('[Tauri] DB init failed:', err)
    })
  }, [persistenceActive])

  useEffect(() => {
    if (!isDesktopApp()) return

    if (projectId === null) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      setHydratedProjectId(null)
      return
    }

    if (persistenceDisabled) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      setHydratedProjectId(null)
      resetProjectState()
      const pathToSeed = pendingSeedPathRef.current
      pendingSeedPathRef.current = null
      if (pathToSeed) {
        const currentRef = useCanvasStore.getState().referenceImage
        if (!currentRef) {
          useCanvasStore.setState({ referenceImage: pathToSeed })
        }
        onSeedReferenceConsumed?.()
      }
      setHydratedProjectId(projectId)
      onReady?.(projectId)
      return
    }

    console.log('[Tauri] Loading project', projectId)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setHydratedProjectId(null)
    resetProjectState()

    let cancelled = false

    const hydrateProject = async () => {
      await Promise.allSettled([
        loadPalettes(projectId)
          .then((raw: unknown[]) => {
            if (!Array.isArray(raw) || raw.length === 0) {
              usePaletteStore.setState({ palettes: [DEFAULT_PALETTE] })
              return
            }

            const loaded = raw.map((p: unknown) => {
              const obj = p as Record<string, unknown>
              return {
                id: (obj.id as string) || 'default',
                name: (obj.name as string) || 'Palette',
                colors: Array.isArray(obj.colors) ? obj.colors : [],
                isActive: obj.isActive === true,
                isDefault: obj.isDefault === true,
                createdAt: (obj.createdAt as number) || 0,
              }
            })

            usePaletteStore.setState({ palettes: loaded })
            console.log('[Tauri] Loaded', loaded.length, 'palettes')
          })
          .catch((err) => {
            console.error('[Tauri] Failed to load palettes:', err)
          }),
        loadPinnedColors(projectId)
          .then((colors) => {
            const pinnedColorState = sanitizePinnedColors(colors)
            useSessionStore.setState({ pinnedColors: pinnedColorState })
            console.log('[Tauri] Loaded', pinnedColorState.length, 'pinned colors')
          })
          .catch((err) => {
            console.error('[Tauri] Failed to load pinned colors:', err)
          }),
        loadProjectSetting(projectId, 'canvas', sanitizeCanvasState)
          .then((canvasState) => {
            useCanvasStore.setState({
              image: null,
              referenceImage: canvasState.referenceImage,
              surfaceImage: canvasState.surfaceImage,
              surfaceBounds: canvasState.surfaceBounds,
              referenceOpacity: canvasState.referenceOpacity,
              referenceLocked: canvasState.referenceLocked,
              referenceTransform: canvasState.referenceTransform,
              valueScaleSettings: canvasState.valueScaleSettings,
              histogramBins: [],
              valueScaleResult: null,
              breakdownValue: 0,
              canvasSettings: canvasState.canvasSettings,
            })
            console.log('[Tauri] Loaded canvas workspace state')
          })
          .catch((err) => {
            console.error('[Tauri] Failed to load canvas state:', err)
          }),
        loadProjectSetting(projectId, 'calibration', sanitizeCalibrationState)
          .then((calibrationState) => {
            useCalibrationStore.setState({
              calibration: calibrationState.calibration,
              calibrationStale: calibrationState.calibration ? isCalibrationStale(calibrationState.calibration) : false,
              measurementLayer: calibrationState.measurementLayer,
              rulerGridEnabled: calibrationState.rulerGridEnabled,
              rulerGridSpacing: calibrationState.rulerGridSpacing,
              gridOpacity: calibrationState.gridOpacity,
            })
            console.log('[Tauri] Loaded calibration state')
          })
          .catch((err) => {
            console.error('[Tauri] Failed to load calibration:', err)
          }),
        loadProjectSetting(projectId, 'layout', sanitizeLayoutState)
          .then((layoutState) => {
            useLayoutStore.setState(layoutState)
            console.log('[Tauri] Loaded layout settings')
          })
          .catch((err: unknown) => {
            console.error('[Tauri] Failed to load layout:', err)
          }),
        loadProjectSetting(projectId, 'paintPalette', sanitizePaintPaletteState)
          .then((paintPaletteState) => {
            usePaintPaletteStore.getState().hydratePersistedState(paintPaletteState)
            console.log('[Tauri] Loaded paint palette state')
          })
          .catch((err) => {
            console.error('[Tauri] Failed to load paint palette state:', err)
          }),
      ])

      if (cancelled) return

      const pathToSeed = pendingSeedPathRef.current
      pendingSeedPathRef.current = null
      if (pathToSeed) {
        const currentRef = useCanvasStore.getState().referenceImage
        if (!currentRef) {
          useCanvasStore.setState({ referenceImage: pathToSeed })
        }
        onSeedReferenceConsumed?.()
      }

      setHydratedProjectId(projectId)
      onReady?.(projectId)
    }

    hydrateProject()

    return () => {
      cancelled = true
    }
  }, [onReady, onSeedReferenceConsumed, persistenceDisabled, projectId, resetProjectState])

  const debouncedSave = useCallback(() => {
    if (!persistenceActive || hydratedProjectId === null) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      return
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(() => {
      persistDesktopProjectSnapshot(hydratedProjectId)
    }, 500)
  }, [
    activePaintPaletteId,
    calibration,
    canvasSettings,
    compactMode,
    gridOpacity,
    hydratedProjectId,
    isPaintPaletteDirty,
    measurementLayer,
    palettes,
    pinnedColors,
    referenceImage,
    referenceLocked,
    referenceOpacity,
    referenceTransform,
    rulerGridEnabled,
    rulerGridSpacing,
    savedPaintPalettes,
    selectedPaintIds,
    sidebarCollapsed,
    sidebarWidth,
    simpleMode,
    surfaceBounds,
    surfaceImage,
    valueScaleSettings,
    persistenceActive,
  ])

  useEffect(() => {
    debouncedSave()
  }, [debouncedSave])

  const flushPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    if (!persistenceActive) return
    const pid = hydratedProjectIdRef.current
    if (pid === null) return
    persistDesktopProjectSnapshot(pid)
  }, [persistenceActive])

  useEffect(() => {
    if (!persistenceActive) return

    window.addEventListener('pagehide', flushPendingSave)
    window.addEventListener('beforeunload', flushPendingSave)

    return () => {
      flushPendingSave()
      window.removeEventListener('pagehide', flushPendingSave)
      window.removeEventListener('beforeunload', flushPendingSave)
    }
  }, [flushPendingSave, persistenceActive])

  return null
}
