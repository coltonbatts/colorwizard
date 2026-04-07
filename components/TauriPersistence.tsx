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
import { usePaletteStore } from '@/lib/store/usePaletteStore'
import { useSessionStore } from '@/lib/store/useSessionStore'
import { useCalibrationStore } from '@/lib/store/useCalibrationStore'
import { useCanvasStore } from '@/lib/store/useCanvasStore'
import { useLayoutStore } from '@/lib/store/useLayoutStore'
import { DEFAULT_PALETTE } from '@/lib/types/palette'
import { DEFAULT_CANVAS_SETTINGS } from '@/lib/types/canvas'
import { DEFAULT_VALUE_SCALE_SETTINGS } from '@/lib/types/valueScale'
import {
  isTauri,
  initDatabase,
  loadPalettes,
  savePalettes,
  savePinnedColors,
  setAppSetting,
  getAppSetting,
} from '@/lib/tauri'

interface TauriPersistenceProps {
  projectId: number | null
  onReady?: (projectId: number) => void
}

const DEFAULT_SIDEBAR_WIDTH = 360

function projectSettingKey(projectId: number, key: string): string {
  return `project:${projectId}:${key}`
}

export default function TauriPersistence({ projectId, onReady }: TauriPersistenceProps) {
  const hasInitializedRef = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stores - only what we actually persist
  const palettes = usePaletteStore((s) => s.palettes)
  const setPalettes = usePaletteStore((s) => s.setPalettes)
  const pinnedColors = useSessionStore((s) => s.pinnedColors)
  const setPinnedColors = useSessionStore((s) => s.setPinnedColors)
  const calibration = useCalibrationStore((s) => s.calibration)
  const setCalibration = useCalibrationStore((s) => s.setCalibration)
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed)
  const setCompactMode = useLayoutStore((s) => s.setCompactMode)
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth)
  const setSimpleMode = useLayoutStore((s) => s.setSimpleMode)

  const setImage = useCanvasStore((s) => s.setImage)
  const setReferenceImage = useCanvasStore((s) => s.setReferenceImage)
  const setSurfaceImage = useCanvasStore((s) => s.setSurfaceImage)
  const setSurfaceBounds = useCanvasStore((s) => s.setSurfaceBounds)
  const setReferenceOpacity = useCanvasStore((s) => s.setReferenceOpacity)
  const resetReferenceTransform = useCanvasStore((s) => s.resetReferenceTransform)
  const setValueScaleSettings = useCanvasStore((s) => s.setValueScaleSettings)
  const setHistogramBins = useCanvasStore((s) => s.setHistogramBins)
  const setValueScaleResult = useCanvasStore((s) => s.setValueScaleResult)
  const setBreakdownValue = useCanvasStore((s) => s.setBreakdownValue)
  const setCanvasSettings = useCanvasStore((s) => s.setCanvasSettings)

  const setSampledColor = useSessionStore((s) => s.setSampledColor)
  const setActiveHighlightColor = useSessionStore((s) => s.setActiveHighlightColor)
  const setValueModeEnabled = useSessionStore((s) => s.setValueModeEnabled)

  const [hydratedProjectId, setHydratedProjectId] = useState<number | null>(null)

  const resetProjectState = useCallback(() => {
    setPalettes([DEFAULT_PALETTE])
    setPinnedColors([])
    setCalibration(null)
    setSidebarCollapsed(false)
    setCompactMode(false)
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
    setSimpleMode(true)

    setImage(null)
    setReferenceImage(null)
    setSurfaceImage(null)
    setSurfaceBounds(null)
    setReferenceOpacity(1)
    resetReferenceTransform()
    setValueScaleSettings(DEFAULT_VALUE_SCALE_SETTINGS)
    setHistogramBins([])
    setValueScaleResult(null)
    setBreakdownValue(0)
    setCanvasSettings(DEFAULT_CANVAS_SETTINGS)

    setSampledColor(null)
    setActiveHighlightColor(null)
    setValueModeEnabled(false)
  }, [
    resetReferenceTransform,
    setActiveHighlightColor,
    setBreakdownValue,
    setCalibration,
    setCanvasSettings,
    setCompactMode,
    setHistogramBins,
    setImage,
    setPalettes,
    setPinnedColors,
    setReferenceImage,
    setReferenceOpacity,
    setSampledColor,
    setSidebarCollapsed,
    setSidebarWidth,
    setSimpleMode,
    setSurfaceBounds,
    setSurfaceImage,
    setValueModeEnabled,
    setValueScaleResult,
    setValueScaleSettings,
  ])

  // Step 1: Init DB on first mount
  useEffect(() => {
    if (!isTauri() || hasInitializedRef.current) return
    hasInitializedRef.current = true

    initDatabase().catch((err) => {
      console.error('[Tauri] DB init failed:', err)
    })
  }, [])

  // Step 2: Load data when project is set
  useEffect(() => {
    if (!isTauri()) return

    if (projectId === null) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      setHydratedProjectId(null)
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
              setPalettes([DEFAULT_PALETTE])
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

            setPalettes(loaded)
            console.log('[Tauri] Loaded', loaded.length, 'palettes')
          })
          .catch((err) => {
            console.error('[Tauri] Failed to load palettes:', err)
          }),
        getAppSetting(projectSettingKey(projectId, 'calibration'))
          .then((calStr) => {
            if (!calStr) return
            try {
              const calData = JSON.parse(calStr)
              setCalibration(calData)
              console.log('[Tauri] Loaded calibration')
            } catch (e) {
              console.error('[Tauri] Failed to parse calibration:', e)
            }
          })
          .catch((err: unknown) => {
            console.error('[Tauri] Failed to load calibration:', err)
          }),
        getAppSetting(projectSettingKey(projectId, 'layout'))
          .then((layoutStr) => {
            if (!layoutStr) return
            try {
              const layout = JSON.parse(layoutStr) as Record<string, number | string | boolean>
              if (typeof layout.sidebarCollapsed === 'boolean') setSidebarCollapsed(layout.sidebarCollapsed)
              if (typeof layout.compactMode === 'boolean') setCompactMode(layout.compactMode)
              if (typeof layout.sidebarWidth === 'number') setSidebarWidth(layout.sidebarWidth)
              if (typeof layout.simpleMode === 'boolean') setSimpleMode(layout.simpleMode)
              console.log('[Tauri] Loaded layout settings')
            } catch (e) {
              console.error('[Tauri] Failed to parse layout:', e)
            }
          })
          .catch((err: unknown) => {
            console.error('[Tauri] Failed to load layout:', err)
          }),
      ])

      if (cancelled) return

      setHydratedProjectId(projectId)
      onReady?.(projectId)
    }

    hydrateProject()

    return () => {
      cancelled = true
    }
  }, [
    onReady,
    projectId,
    resetProjectState,
    setCalibration,
    setCompactMode,
    setPalettes,
    setSidebarCollapsed,
    setSidebarWidth,
    setSimpleMode,
  ])

  // Step 3: Debounced save on store changes
  const debouncedSave = useCallback(() => {
    if (!isTauri() || hydratedProjectId === null) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      return
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(() => {
      savePalettes(hydratedProjectId, palettes).catch((err: unknown) => {
        console.error('[Tauri] Save palettes failed:', err)
      })

      savePinnedColors(hydratedProjectId, pinnedColors).catch((err: unknown) => {
        console.error('[Tauri] Save pinned colors failed:', err)
      })

      if (calibration) {
        setAppSetting(projectSettingKey(hydratedProjectId, 'calibration'), JSON.stringify(calibration)).catch((err: unknown) => {
          console.error('[Tauri] Save calibration failed:', err)
        })
      }

      setAppSetting(projectSettingKey(hydratedProjectId, 'layout'), JSON.stringify({
        sidebarCollapsed: useLayoutStore.getState().sidebarCollapsed,
        compactMode: useLayoutStore.getState().compactMode,
        sidebarWidth: useLayoutStore.getState().sidebarWidth,
        simpleMode: useLayoutStore.getState().simpleMode,
      })).catch((err: unknown) => {
        console.error('[Tauri] Save layout failed:', err)
      })
    }, 500)
  }, [hydratedProjectId, palettes, pinnedColors, calibration])

  useEffect(() => {
    debouncedSave()
  }, [debouncedSave])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  return null
}
