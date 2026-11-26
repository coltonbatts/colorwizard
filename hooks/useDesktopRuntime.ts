'use client'

import { useLayoutEffect, useState } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'

/**
 * Hydration-safe desktop detection.
 * Returns false on the server and on the first client render (must match SSR), then flips
 * synchronously in useLayoutEffect — before paint — so ColorWizard Pro never flashes the web
 * marketing empty state (see ImageCanvas desktopShell / layout-hero-mode).
 */
export function useDesktopRuntime(): boolean {
  const [isDesktopRuntime, setIsDesktopRuntime] = useState(false)

  useLayoutEffect(() => {
    setIsDesktopRuntime(isDesktopApp())
  }, [])

  return isDesktopRuntime
}
