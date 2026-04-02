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
import { useLayoutStore } from '@/lib/store/useLayoutStore'
import {
  isTauri,
  initDatabase,
  loadPalettes,
  savePalettes,
  loadPinnedColors,
  savePinnedColors,
  setAppSetting,
  getAppSetting,
} from '@/lib/tauri'

interface TauriPersistenceProps {
  projectId: number | null
}

export default function TauriPersistence({ projectId }: TauriPersistenceProps) {
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

  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)

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
    if (!isTauri() || projectId === null) return

    console.log('[Tauri] Loading project', projectId)
    setActiveProjectId(projectId)

    // Load palettes
    loadPalettes(projectId).then((raw: unknown[]) => {
      if (!Array.isArray(raw) || raw.length === 0) return
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
    }).catch((err) => {
      console.error('[Tauri] Failed to load palettes:', err)
    })

    // Load pinned colors - skip for now, stored in localStorage
    // Full SQLite migration in Step 3

    // Load calibration from settings
    getAppSetting('calibration').then((calStr) => {
      if (!calStr) return
      try {
        const calData = JSON.parse(calStr)
        setCalibration(calData)
        console.log('[Tauri] Loaded calibration')
      } catch (e) {
        console.error('[Tauri] Failed to parse calibration:', e)
      }
    }).catch((err: unknown) => {
      console.error('[Tauri] Failed to load calibration:', err)
    })

    // Load layout settings
    getAppSetting('layout').then((layoutStr) => {
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
    }).catch((err: unknown) => {
      console.error('[Tauri] Failed to load layout:', err)
    })
  }, [projectId])

  // Step 3: Debounced save on store changes
  const debouncedSave = useCallback(() => {
    if (!isTauri() || activeProjectId === null) return

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(() => {
      savePalettes(activeProjectId, palettes).catch((err: unknown) => {
        console.error('[Tauri] Save palettes failed:', err)
      })

      savePinnedColors(activeProjectId, pinnedColors).catch((err: unknown) => {
        console.error('[Tauri] Save pinned colors failed:', err)
      })

      if (calibration) {
        setAppSetting('calibration', JSON.stringify(calibration)).catch((err: unknown) => {
          console.error('[Tauri] Save calibration failed:', err)
        })
      }
    }, 500)
  }, [activeProjectId, palettes, pinnedColors, calibration])

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
