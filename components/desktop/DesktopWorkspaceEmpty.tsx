/**
 * Covers the web marketing empty state in the desktop project frame with a minimal tool UI.
 */
'use client'

import { useCallback, useState } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'
import { pickImagePath } from '@/lib/desktop/tauriClient'
import { useCanvasStore } from '@/lib/store/useCanvasStore'

export default function DesktopWorkspaceEmpty() {
  const referenceImage = useCanvasStore((s) => s.referenceImage)
  const setReferenceImage = useCanvasStore((s) => s.setReferenceImage)
  const [busy, setBusy] = useState(false)

  const handleOpen = useCallback(async () => {
    setBusy(true)
    try {
      const path = await pickImagePath()
      if (path) setReferenceImage(path)
    } finally {
      setBusy(false)
    }
  }, [setReferenceImage])

  if (!isDesktopApp() || referenceImage) return null

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[200] flex flex-col items-center justify-center bg-[#f5f0e8] px-6"
      role="region"
      aria-label="Project workspace"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8f7f69]">Reference image</p>
      <h2 className="mt-3 max-w-md text-center font-serif text-2xl text-[#1a1a1a] sm:text-3xl">
        Add an image to start sampling colors
      </h2>
      <p className="mt-3 max-w-sm text-center text-sm text-[#6d5e49]">
        Opens in this project only. Files stay on your Mac.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={handleOpen}
        className="mt-8 rounded-full border border-[#1a1a1a] bg-[#1a1a1a] px-8 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Opening…' : 'Open image…'}
      </button>
      <p className="mt-6 text-xs text-[#a89880]">Or drop a file onto the canvas if your workflow supports it.</p>
    </div>
  )
}
