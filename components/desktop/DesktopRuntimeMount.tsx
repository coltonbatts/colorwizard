'use client'

import { useEffect } from 'react'

export default function DesktopRuntimeMount() {
  useEffect(() => {
    document.documentElement.dataset.reactMounted = 'true'

    return () => {
      delete document.documentElement.dataset.reactMounted
    }
  }, [])

  return null
}
