'use client'

import { forwardRef, useEffect, useRef } from 'react'
import { getStepIndex, stepToGray, type ValueScaleResult } from '@/lib/valueScale'
import type { ValueBuffer } from '@/hooks/useImageAnalyzer'

interface ValueOverlayProps {
  valueBuffer: ValueBuffer | null
  enabled: boolean
  valueScaleResult: ValueScaleResult | null
  onRendered?: () => void
}

export const ValueOverlay = forwardRef<HTMLCanvasElement, ValueOverlayProps>(function ValueOverlay(
  { valueBuffer, enabled, valueScaleResult, onRendered },
  ref
) {
  const localRef = useRef<HTMLCanvasElement | null>(null)

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
    if (!canvas || !valueBuffer || !valueScaleResult || !enabled) {
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      onRendered?.()
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== valueBuffer.width || canvas.height !== valueBuffer.height) {
      canvas.width = valueBuffer.width
      canvas.height = valueBuffer.height
    }

    const imageData = ctx.createImageData(valueBuffer.width, valueBuffer.height)
    const data = imageData.data
    const { y: yBuffer } = valueBuffer
    const pixelCount = yBuffer.length

    const thresholds = valueScaleResult.thresholds
    const numSteps = thresholds.length - 1

    for (let i = 0; i < pixelCount; i++) {
      const y = yBuffer[i]
      const stepIdx = getStepIndex(y, thresholds)
      const val = stepToGray(stepIdx, numSteps)

      const idx = i * 4
      data[idx] = val
      data[idx + 1] = val
      data[idx + 2] = val
      data[idx + 3] = 255
    }

    ctx.putImageData(imageData, 0, 0)
    onRendered?.()
  }, [valueBuffer, enabled, valueScaleResult, onRendered])

  return <canvas ref={localRef} id="value-map-canvas" style={{ display: 'none' }} />
})

export default ValueOverlay
