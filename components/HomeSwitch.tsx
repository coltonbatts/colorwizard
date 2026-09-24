'use client'

/**
 * The web opens on the simple version. The desktop app keeps the full workbench for now,
 * because its project gallery, licensing, and SQLite persistence are wired to the workbench stores.
 */

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import SimpleApp from '@/components/simple/SimpleApp'
import { isDesktopApp } from '@/lib/desktop/detect'

// Only the desktop app pays for the full workbench bundle.
const CoreWorkbench = dynamic(() => import('@/components/workbench/CoreWorkbench'), { ssr: false })

export default function HomeSwitch() {
  const [runtime, setRuntime] = useState<'web' | 'desktop' | null>(null)

  useEffect(() => {
    setRuntime(isDesktopApp() ? 'desktop' : 'web')
  }, [])

  if (runtime === null) return null
  return runtime === 'desktop' ? <CoreWorkbench /> : <SimpleApp />
}
