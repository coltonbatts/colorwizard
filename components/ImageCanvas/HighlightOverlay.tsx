'use client'

import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react'

interface HighlightOverlayProps {
  imageData: Uint8ClampedArray | null
  width: number
  height: number
  onRendered?: () => void
}

export const HighlightOverlay = forwardRef<HTMLCanvasElement, HighlightOverlayProps>(function HighlightOverlay(
  { imageData, width, height, onRendered },
  ref
) {
  const localRef = useRef<HTMLCanvasElement | null>(null)
  const onRenderedRef = useRef(onRendered)
  useLayoutEffect(() => {
    onRenderedRef.current = onRendered
  })

  useEffect(() => {
    if (!ref) return
    if (typeof ref === 'function') {
      ref(localRef.current)
    } else {
      ref.current = localRef.current
    }
  }, [ref])

  useEffect(() => {
    const canvas = localRef.current
    if (!canvas || !imageData || width === 0 || height === 0) {
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      onRenderedRef.current?.()
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const image = new ImageData(new Uint8ClampedArray(imageData), width, height)
    ctx.putImageData(image, 0, 0)
    onRenderedRef.current?.()
  }, [imageData, width, height])

  return <canvas ref={localRef} className="absolute top-0 left-0 pointer-events-none" style={{ display: 'none' }} />
})

export default HighlightOverlay
