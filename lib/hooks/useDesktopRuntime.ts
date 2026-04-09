'use client'

import { useEffect, useState } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'

/**
 * Hydration-safe desktop detection.
 * Returns false on the server and on the first client render, then resolves after mount.
 */
export function useDesktopRuntime(): boolean {
  const [isDesktopRuntime, setIsDesktopRuntime] = useState(false)

  useEffect(() => {
    setIsDesktopRuntime(isDesktopApp())
  }, [])

  return isDesktopRuntime
}
