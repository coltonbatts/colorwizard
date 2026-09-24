'use client'

/**
 * The picture. Fits the image to the stage, samples on press or drag, and can show values only.
 * A loupe follows the pointer so single pixels are easy to hit.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { rgbToHex } from '@/lib/color/conversions'
import { linearToSRGB, getRelativeLuminance } from '@/lib/valueScale'
import styles from './simple.module.css'

export interface SamplePoint {
  x: number
  y: number
}

export interface PickedColor {
  hex: string
  rgb: { r: number; g: number; b: number }
}

interface SimpleCanvasProps {
  source: HTMLCanvasElement
  valueView: boolean
  point: SamplePoint | null
  onSample: (point: SamplePoint, color: PickedColor) => void
}

const STAGE_PADDING = 24
const STAGE_PADDING_NARROW = 12
const SAMPLE_RADIUS = 1 // 3x3 average smooths JPEG noise without drifting off the clicked pixel
const LOUPE_SIZE = 136 // css px
const LOUPE_SPAN = 17 // source pixels across; odd so one pixel sits dead center
const LOUPE_GAP = 20 // distance from the pointer, so the loupe never hides what it magnifies

interface Hover {
  x: number
  y: number
  localX: number
  localY: number
  touch: boolean
}

/** A gray image whose every pixel has the same luminance as the original. */
function buildValueCanvas(source: HTMLCanvasElement, pixels: ImageData) {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const out = ctx.createImageData(source.width, source.height)
  const { data } = pixels
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(linearToSRGB(getRelativeLuminance(data[i], data[i + 1], data[i + 2])) * 255)
    out.data[i] = gray
    out.data[i + 1] = gray
    out.data[i + 2] = gray
    out.data[i + 3] = 255
  }
  ctx.putImageData(out, 0, 0)
  return canvas
}

export default function SimpleCanvas({ source, valueView, point, onSample }: SimpleCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loupeRef = useRef<HTMLCanvasElement>(null)
  const pressedRef = useRef(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hover, setHover] = useState<Hover | null>(null)

  const pixels = useMemo(() => {
    const ctx = source.getContext('2d', { willReadFrequently: true })
    return ctx ? ctx.getImageData(0, 0, source.width, source.height) : null
  }, [source])

  const valueCanvasRef = useRef<{ source: HTMLCanvasElement; canvas: HTMLCanvasElement } | null>(null)
  const getValueCanvas = useCallback(() => {
    if (!pixels) return source
    if (valueCanvasRef.current?.source !== source) {
      valueCanvasRef.current = { source, canvas: buildValueCanvas(source, pixels) }
    }
    return valueCanvasRef.current.canvas
  }, [pixels, source])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width: Math.floor(width), height: Math.floor(height) })
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const fit = useMemo(() => {
    const padding = size.width < 600 ? STAGE_PADDING_NARROW : STAGE_PADDING
    const available = {
      width: Math.max(1, size.width - padding * 2),
      height: Math.max(1, size.height - padding * 2),
    }
    const scale = Math.min(available.width / source.width, available.height / source.height)
    const width = source.width * scale
    const height = source.height * scale
    return {
      scale,
      x: (size.width - width) / 2,
      y: (size.height - height) / 2,
      width,
      height,
    }
  }, [size, source])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.width * dpr
    canvas.height = size.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.width, size.height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(valueView ? getValueCanvas() : source, fit.x, fit.y, fit.width, fit.height)

    if (point) {
      const cx = fit.x + (point.x + 0.5) * fit.scale
      const cy = fit.y + (point.y + 0.5) * fit.scale
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    }
  }, [fit, getValueCanvas, point, size, source, valueView])

  const locate = useCallback((clientX: number, clientY: number, touch: boolean): Hover | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    const localX = clientX - bounds.left
    const localY = clientY - bounds.top
    const x = Math.floor((localX - fit.x) / fit.scale)
    const y = Math.floor((localY - fit.y) / fit.scale)
    if (x < 0 || y < 0 || x >= source.width || y >= source.height) return null
    return { x, y, localX, localY, touch }
  }, [fit, source])

  const sampleAt = useCallback((at: Hover) => {
    if (!pixels) return
    const { x, y } = at
    let r = 0, g = 0, b = 0, count = 0
    for (let dy = -SAMPLE_RADIUS; dy <= SAMPLE_RADIUS; dy++) {
      for (let dx = -SAMPLE_RADIUS; dx <= SAMPLE_RADIUS; dx++) {
        const sx = x + dx
        const sy = y + dy
        if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height) continue
        const i = (sy * source.width + sx) * 4
        r += pixels.data[i]
        g += pixels.data[i + 1]
        b += pixels.data[i + 2]
        count++
      }
    }
    const rgb = { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) }
    onSample({ x, y }, { rgb, hex: rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase() })
  }, [onSample, pixels, source])

  // Nearest-neighbour magnification: the loupe shows real pixels, never smoothed guesses.
  useEffect(() => {
    const loupe = loupeRef.current
    if (!loupe || !hover) return
    const dpr = window.devicePixelRatio || 1
    loupe.width = LOUPE_SIZE * dpr
    loupe.height = LOUPE_SIZE * dpr
    const ctx = loupe.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false

    const cell = LOUPE_SIZE / LOUPE_SPAN
    const half = (LOUPE_SPAN - 1) / 2
    const left = hover.x - half
    const top = hover.y - half
    // Clip the source rect to the image by hand; browsers disagree on out-of-bounds drawImage.
    const sx = Math.max(0, left)
    const sy = Math.max(0, top)
    const sw = Math.min(source.width, left + LOUPE_SPAN) - sx
    const sh = Math.min(source.height, top + LOUPE_SPAN) - sy

    ctx.fillStyle = '#777777'
    ctx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
    ctx.drawImage(valueView ? getValueCanvas() : source, sx, sy, sw, sh, (sx - left) * cell, (sy - top) * cell, sw * cell, sh * cell)

    // Outline exactly the pixels that get averaged into the sample.
    const edge = (half - SAMPLE_RADIUS) * cell
    const span = (SAMPLE_RADIUS * 2 + 1) * cell
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.strokeRect(edge, edge, span, span)
    ctx.lineWidth = 1
    ctx.strokeStyle = '#ffffff'
    ctx.strokeRect(edge, edge, span, span)
  }, [getValueCanvas, hover, source, valueView])

  const loupePosition = useMemo(() => {
    if (!hover) return null
    if (hover.touch) {
      // Above the finger, clamped to the stage.
      return {
        left: Math.min(Math.max(0, hover.localX - LOUPE_SIZE / 2), size.width - LOUPE_SIZE),
        top: Math.max(0, hover.localY - LOUPE_SIZE - LOUPE_GAP * 2.5),
      }
    }
    // Up and to the right of the cursor, flipping away from the edges.
    const right = hover.localX + LOUPE_GAP + LOUPE_SIZE <= size.width
    const above = hover.localY - LOUPE_GAP - LOUPE_SIZE >= 0
    return {
      left: right ? hover.localX + LOUPE_GAP : hover.localX - LOUPE_GAP - LOUPE_SIZE,
      top: above ? hover.localY - LOUPE_GAP - LOUPE_SIZE : hover.localY + LOUPE_GAP,
    }
  }, [hover, size])

  return (
    <div ref={frameRef} className={styles.stage}>
      <canvas
        ref={canvasRef}
        className={styles.stageCanvas}
        style={{ width: size.width, height: size.height }}
        aria-label="Your picture. Click or drag to read a color."
        onPointerDown={(event) => {
          pressedRef.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          const at = locate(event.clientX, event.clientY, event.pointerType !== 'mouse')
          setHover(at)
          if (at) sampleAt(at)
        }}
        onPointerMove={(event) => {
          const at = locate(event.clientX, event.clientY, event.pointerType !== 'mouse')
          setHover(at)
          if (pressedRef.current && at) sampleAt(at)
        }}
        onPointerUp={(event) => {
          pressedRef.current = false
          if (event.pointerType !== 'mouse') setHover(null)
        }}
        onPointerCancel={() => {
          pressedRef.current = false
          setHover(null)
        }}
        onPointerLeave={() => { if (!pressedRef.current) setHover(null) }}
      />
      {loupePosition && (
        <canvas
          ref={loupeRef}
          className={styles.loupe}
          style={{ width: LOUPE_SIZE, height: LOUPE_SIZE, left: loupePosition.left, top: loupePosition.top }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
