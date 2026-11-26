'use client'

import { useEffect } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'

export default function DesktopRuntimeMount() {
  useEffect(() => {
    // On desktop, `TauriAppShell` marks `reactMounted` once its chunk has mounted
    // so the boot splash stays up until the desktop shell is ready to paint.
    if (isDesktopApp()) return
    document.documentElement.dataset.reactMounted = 'true'

    return () => {
      delete document.documentElement.dataset.reactMounted
    }
  }, [])

  return null
}
