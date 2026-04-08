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
      className="pointer-events-auto absolute inset-0 z-[200] bg-[#f5f0e8]"
      role="region"
      aria-label="Project workspace"
    >
      <div className="absolute inset-6 rounded-[26px] border border-[#ddd1c0] bg-white/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" aria-hidden="true" />
      <div className="absolute left-6 top-6 flex max-w-md items-center gap-3 rounded-2xl border border-[#d7cab8] bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
        <button
          type="button"
          disabled={busy}
          onClick={handleOpen}
          className="rounded-full border border-[#1a1a1a] bg-[#1a1a1a] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Opening…' : 'Open image…'}
        </button>
        <p className="text-sm text-[#6d5e49]">Add a reference image to this project.</p>
      </div>
    </div>
  )
}
