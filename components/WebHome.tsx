'use client'

/**
 * The web build's home: the simple app, rendered into the static HTML so the welcome
 * paints before any JavaScript runs. Desktop builds use `HomeSwitch` instead (see
 * `app/page.tsx`). If a web build is ever opened inside Tauri, it still switches to the
 * workbench after mount, as `HomeSwitch` would.
 */

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import SimpleApp from '@/components/simple/SimpleApp'
import { isDesktopApp } from '@/lib/desktop/detect'

const CoreWorkbench = dynamic(() => import('@/components/workbench/CoreWorkbench'), { ssr: false })

export default function WebHome() {
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    if (isDesktopApp()) setDesktop(true)
  }, [])

  return desktop ? <CoreWorkbench /> : <SimpleApp />
}
