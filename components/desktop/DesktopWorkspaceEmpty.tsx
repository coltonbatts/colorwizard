/**
 * Desktop project workspace before a reference image exists.
 * Tool-first: drop zone + open dialog + keyboard — no web marketing copy.
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
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
  const reduceMotion = useReducedMotion()

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
      className="pointer-events-auto absolute inset-0 z-[200] flex items-center justify-center bg-[#f0ebe3]/95 p-6 backdrop-blur-[2px]"
      role="region"
      aria-label="Add reference"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Neutral drafting grid — no palette or product marketing */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #c9bfb0 1px, transparent 1px),
            linear-gradient(to bottom, #c9bfb0 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#f5f0e8]/80 to-[#ebe4da]/90" aria-hidden="true" />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className={`relative z-10 flex w-full max-w-lg flex-col items-center rounded-[28px] border-2 border-dashed px-8 py-12 text-center shadow-[0_24px_60px_rgba(26,26,26,0.08)] transition-[border-color,transform,box-shadow] duration-200 ${
          dragOver
            ? 'scale-[1.02] border-[#1a1a1a] bg-white/95 shadow-[0_28px_70px_rgba(26,26,26,0.14)]'
            : 'border-[#c7baa5] bg-white/88'
        }`}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8f7f69]">Workspace</p>
        <h2 className="mt-3 font-serif text-2xl text-[#1a1a1a] sm:text-3xl">Add a reference</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#5c5145]">
          Drop a file on this window, or choose one from disk. Keyboard:{' '}
          <kbd className="rounded border border-[#d7cab8] bg-[#faf7f2] px-1.5 py-0.5 font-mono text-xs text-[#1a1a1a]">
            {typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent) ? '⌘' : 'Ctrl+'}
            O
          </kbd>
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleOpen()}
          className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#1a1a1a] px-8 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Opening…' : 'Open file…'}
        </button>
        <p className="mt-4 text-xs text-[#8f7f69]">JPEG, PNG, WebP, HEIC, and common formats</p>
      </motion.div>
    </div>
  )
}
