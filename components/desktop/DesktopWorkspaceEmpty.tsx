/**
 * Desktop project workspace before a reference image exists.
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import ColorWizardSplashLottie from '@/components/splash/ColorWizardSplashLottie'
import { isDesktopApp } from '@/lib/desktop/detect'
import { pickImagePath } from '@/lib/desktop/tauriClient'
import { useCanvasStore } from '@/lib/store/useCanvasStore'

function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true
  const ext = file.name.toLowerCase().split('.').pop()
  return Boolean(
    ext &&
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'avif'].includes(ext),
  )
}

export default function DesktopWorkspaceEmpty() {
  const referenceImage = useCanvasStore((s) => s.referenceImage)
  const runtimeImage = useCanvasStore((s) => s.image)
  const setReferenceImage = useCanvasStore((s) => s.setReferenceImage)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleOpen = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const path = await pickImagePath()
      if (path) setReferenceImage(path)
    } finally {
      setBusy(false)
    }
  }, [busy, setReferenceImage])

  const loadDroppedFile = useCallback(
    async (file: File) => {
      const isHeic =
        file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif') ||
        file.type === 'image/heic' ||
        file.type === 'image/heif'

      if (isHeic) {
        try {
          setBusy(true)
          const heic2anyModule = await import('heic2any')
          const heic2any = heic2anyModule.default || heic2anyModule
          if (typeof heic2any !== 'function') throw new Error('HEIC converter unavailable')
          const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
          const blob = Array.isArray(out) ? out[0] : out
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader()
            r.onload = () => resolve(r.result as string)
            r.onerror = () => reject(new Error('read failed'))
            r.readAsDataURL(blob)
          })
          setReferenceImage(dataUrl)
        } catch {
          window.alert('Could not read that HEIC file. Try Open file… or convert to JPEG first.')
        } finally {
          setBusy(false)
        }
        return
      }

      setBusy(true)
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        if (dataUrl) setReferenceImage(dataUrl)
        setBusy(false)
      }
      reader.onerror = () => {
        window.alert('Could not read that file.')
        setBusy(false)
      }
      reader.readAsDataURL(file)
    },
    [setReferenceImage],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    setDragOver(false)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)
      if (busy) return
      const file = e.dataTransfer.files[0]
      if (!file || !isImageFile(file)) {
        if (file) window.alert('That file type is not supported here.')
        return
      }
      void loadDroppedFile(file)
    },
    [busy, loadDroppedFile],
  )

  useEffect(() => {
    if (!isDesktopApp() || referenceImage || runtimeImage) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        void handleOpen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [referenceImage, runtimeImage, handleOpen])

  if (!isDesktopApp() || referenceImage || runtimeImage) return null

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[200] flex items-center justify-center bg-paper-shell p-6"
      role="region"
      aria-label="Load reference image"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        className={`relative z-10 flex w-full max-w-md flex-col items-center text-center transition-transform duration-200 ${
          dragOver ? 'scale-[1.02]' : ''
        }`}
      >
        <ColorWizardSplashLottie className="h-[min(52vw,280px)] w-[min(52vw,280px)] max-h-[280px] max-w-[280px]" />

        <h1 className="mt-8 font-display text-[clamp(2.25rem,6vw,3.25rem)] font-medium leading-none tracking-tight text-ink">
          ColorWizard
        </h1>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleOpen()}
          className="studio-action mt-10 min-h-[44px] px-8 py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Opening…' : 'Choose file'}
        </button>
      </div>
    </div>
  )
}
