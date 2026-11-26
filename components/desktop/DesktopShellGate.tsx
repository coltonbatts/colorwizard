'use client'

/**
 * Root layout shell gate.
 *
 * Keeps `TauriAppShell` (and its desktop-only project gallery, licensing, and
 * SQLite persistence tree) out of the web first-load JS bundle: web visitors
 * receive `children` directly without downloading or parsing any desktop code.
 *
 * - In `COLORWIZARD_DESKTOP=1` builds, `desktopBuild` is true and `TauriAppShell`
 *   mounts as soon as the client boots (while `.desktop-boot-splash` covers the
 *   window until `TauriAppShell` signals `data-react-mounted="true"`).
 * - In standard web builds, SSR and initial hydration render `children` unchanged
 *   (preserving pre-rendered welcome HTML in `out/index.html`). If that web build
 *   is ever opened inside Tauri, `isDesktopApp()` triggers loading `TauriAppShell`
 *   dynamically after mount.
 */

import dynamic from 'next/dynamic'
import { useEffect, useState, type ReactNode } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'

const TauriAppShell = dynamic(() => import('./TauriAppShell'), { ssr: false })

export default function DesktopShellGate({
  desktopBuild = false,
  children,
}: {
  desktopBuild?: boolean
  children: ReactNode
}) {
  const [desktop, setDesktop] = useState(desktopBuild)

  useEffect(() => {
    if (!desktop && isDesktopApp()) {
      setDesktop(true)
    }
  }, [desktop])

  return desktop ? <TauriAppShell>{children}</TauriAppShell> : <>{children}</>
}
