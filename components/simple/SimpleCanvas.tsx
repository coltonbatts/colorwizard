'use client'

/**
 * The picture, as a viewfinder.
 *
 * Mouse and trackpad: scroll or pinch to zoom at the cursor, drag to move, click to sample.
 * Touch: pinch to zoom, drag to move, tap to sample, press and hold to pick with the loupe.
 * Keys: + and − zoom, 0 fits. Past a few screen pixels per image pixel, pixels render crisp
 * and a click samples the single pixel under it, so what you see is exactly what you get.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { rgbToHex } from '@/lib/color/conversions'
import { linearToSRGB, getRelativeLuminance } from '@/lib/valueScale'
import styles from './simple.module.css'

export interface SamplePoint {
  x: number
  y: number
  /** Half-width of the averaged square: 1 is a 3x3 average, 0 is the single pixel. */
  radius: number
}

export interface PickedColor {
  hex: string
  rgb: { r: number; g: number; b: number }
}

interface SimpleCanvasProps {
  source: HTMLCanvasElement
  valueView: boolean
  point: SamplePoint | null
  /** `origin` (client px) is set for deliberate clicks and taps, not drags, so the pick can pour in. */
  onSample: (point: SamplePoint, color: PickedColor, origin?: { x: number; y: number }) => void
}

/** Image origin in stage css px, and css px per image pixel. */
interface View {
  x: number
  y: number
  scale: number
}

interface Hover {
  x: number
  y: number
  localX: number
  localY: number
  touch: boolean
}

type Gesture =
  | { kind: 'none' }
  | { kind: 'pending'; startX: number; startY: number; startView: View; touch: boolean }
  | { kind: 'pan'; startX: number; startY: number; startView: View }
  | { kind: 'pinch'; startDistance: number; anchorX: number; anchorY: number; startView: View }
  | { kind: 'scrub' }

const STAGE_PADDING = 24
const STAGE_PADDING_NARROW = 12
// Zoomed out, a 3x3 average forgives an imprecise click and smooths JPEG noise.
// Zoomed in far enough to see pixels, a click means exactly that pixel.
const SAMPLE_RADIUS = 1
const PRECISE_SAMPLE_RADIUS = 0
const LOUPE_SIZE = 136 // css px
const LOUPE_SPAN = 17 // source pixels across; odd so one pixel sits dead center
const LOUPE_GAP = 20 // distance from the pointer, so the loupe never hides what it magnifies
const MAX_SCALE = 64 // css px per image pixel at full zoom
const CRISP_SCALE = 4 // at or beyond this, show real pixels instead of smoothed ones
const DRAG_THRESHOLD_MOUSE = 4
const DRAG_THRESHOLD_TOUCH = 8
const HOLD_TO_PICK_MS = 350
const KEY_ZOOM_STEP = 1.5

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
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<Gesture>({ kind: 'none' })
  const holdTimerRef = useRef<number | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hover, setHover] = useState<Hover | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  // null means "fit": the view follows the stage size until the user zooms or moves.
  const [userView, setUserView] = useState<View | null>(null)

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

  const fitView = useMemo<View>(() => {
    const padding = size.width < 600 ? STAGE_PADDING_NARROW : STAGE_PADDING
    const scale = Math.min(
      Math.max(1, size.width - padding * 2) / source.width,
      Math.max(1, size.height - padding * 2) / source.height,
    )
    return {
      scale,
      x: (size.width - source.width * scale) / 2,
      y: (size.height - source.height * scale) / 2,
    }
  }, [size, source])

  const view = userView ?? fitView
  const isFit = userView === null
  const sampleRadius = view.scale >= CRISP_SCALE ? PRECISE_SAMPLE_RADIUS : SAMPLE_RADIUS

  /** Keep some of the picture under the middle of the stage so it can't be lost off-screen. */
  const clampView = useCallback((next: View): View | null => {
    if (size.width === 0 || size.height === 0) return null
    if (next.scale <= fitView.scale * 1.001) return null
    const width = source.width * next.scale
    const height = source.height * next.scale
    const cx = size.width / 2
    const cy = size.height / 2
    return {
      scale: next.scale,
      x: Math.min(cx, Math.max(cx - width, next.x)),
      y: Math.min(cy, Math.max(cy - height, next.y)),
    }
  }, [fitView.scale, size, source])

  /** Zoom so the image point under (localX, localY) stays put. */
  const zoomAt = useCallback((from: View, factor: number, localX: number, localY: number) => {
    if (size.width === 0 || size.height === 0) return // not measured yet; any fit would be meaningless
    const scale = Math.min(MAX_SCALE, Math.max(fitView.scale, from.scale * factor))
    const ratio = scale / from.scale
    setUserView(clampView({
      scale,
      x: localX - (localX - from.x) * ratio,
      y: localY - (localY - from.y) * ratio,
    }))
  }, [clampView, fitView.scale, size])

  // Draw.
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
    ctx.imageSmoothingEnabled = view.scale < CRISP_SCALE
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(valueView ? getValueCanvas() : source, view.x, view.y, source.width * view.scale, source.height * view.scale)

    if (point) {
      const cx = view.x + (point.x + 0.5) * view.scale
      const cy = view.y + (point.y + 0.5) * view.scale
      const half = view.scale * (point.radius + 0.5)
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.beginPath()
      if (half >= 8) {
        // Big enough to see: outline exactly the pixels that were sampled.
        ctx.rect(cx - half, cy - half, half * 2, half * 2)
      } else {
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      }
      ctx.stroke()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    }
  }, [getValueCanvas, point, size, source, valueView, view])

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect()
    return bounds ? { localX: clientX - bounds.left, localY: clientY - bounds.top } : null
  }, [])

  const locate = useCallback((clientX: number, clientY: number, touch: boolean): Hover | null => {
    const local = toLocal(clientX, clientY)
    if (!local) return null
    const x = Math.floor((local.localX - view.x) / view.scale)
    const y = Math.floor((local.localY - view.y) / view.scale)
    if (x < 0 || y < 0 || x >= source.width || y >= source.height) return null
    return { x, y, ...local, touch }
  }, [source, toLocal, view])

  const sampleAt = useCallback((at: Hover, deliberate = false) => {
    if (!pixels) return
    const { x, y } = at
    const radius = sampleRadius
    let r = 0, g = 0, b = 0, count = 0
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
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
    const bounds = deliberate ? canvasRef.current?.getBoundingClientRect() : undefined
    const origin = bounds ? { x: bounds.left + at.localX, y: bounds.top + at.localY } : undefined
    onSample({ x, y, radius }, { rgb, hex: rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase() }, origin)
  }, [onSample, pixels, sampleRadius, source])

  // Scroll wheel, Magic Mouse, and trackpad pinch (which arrives as ctrl+wheel) all zoom.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const local = toLocal(event.clientX, event.clientY)
      if (!local) return
      const lines = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1
      const sensitivity = event.ctrlKey ? 0.01 : 0.0018
      zoomAt(view, Math.exp(-event.deltaY * lines * sensitivity), local.localX, local.localY)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [toLocal, view, zoomAt])

  // + and − zoom around the middle; 0 fits.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === '+' || event.key === '=') zoomAt(view, KEY_ZOOM_STEP, size.width / 2, size.height / 2)
      else if (event.key === '-' || event.key === '_') zoomAt(view, 1 / KEY_ZOOM_STEP, size.width / 2, size.height / 2)
      else if (event.key === '0') setUserView(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [size, view, zoomAt])

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  const beginPinch = () => {
    const [a, b] = Array.from(pointersRef.current.values())
    const local = toLocal((a.x + b.x) / 2, (a.y + b.y) / 2)
    if (!local) return
    gestureRef.current = {
      kind: 'pinch',
      startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      anchorX: local.localX,
      anchorY: local.localY,
      startView: view,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* capture is a nicety for drags that leave the canvas; the gesture works without it */
    }
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const touch = event.pointerType === 'touch'

    if (pointersRef.current.size === 2) {
      clearHoldTimer()
      setHover(null)
      setIsPanning(false)
      beginPinch()
      return
    }
    if (pointersRef.current.size > 2) return

    if (event.button === 1) {
      gestureRef.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, startView: view }
      setIsPanning(true)
      return
    }

    gestureRef.current = { kind: 'pending', startX: event.clientX, startY: event.clientY, startView: view, touch }
    if (touch) {
      const { clientX, clientY } = event
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null
        if (gestureRef.current.kind !== 'pending') return
        gestureRef.current = { kind: 'scrub' }
        const at = locate(clientX, clientY, true)
        setHover(at)
        if (at) sampleAt(at)
      }, HOLD_TO_PICK_MS)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    const gesture = gestureRef.current
    const touch = event.pointerType === 'touch'

    if (gesture.kind === 'pinch') {
      const [a, b] = Array.from(pointersRef.current.values())
      if (!a || !b) return
      const local = toLocal((a.x + b.x) / 2, (a.y + b.y) / 2)
      if (!local) return
      const { startView, startDistance, anchorX, anchorY } = gesture
      const scale = Math.min(MAX_SCALE, Math.max(fitView.scale, startView.scale * Math.hypot(a.x - b.x, a.y - b.y) / startDistance))
      const ratio = scale / startView.scale
      // The image point that started under the fingers' midpoint follows the midpoint.
      setUserView(clampView({
        scale,
        x: local.localX - (anchorX - startView.x) * ratio,
        y: local.localY - (anchorY - startView.y) * ratio,
      }))
      return
    }

    if (gesture.kind === 'pending') {
      const threshold = gesture.touch ? DRAG_THRESHOLD_TOUCH : DRAG_THRESHOLD_MOUSE
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > threshold) {
        clearHoldTimer()
        gestureRef.current = { kind: 'pan', startX: gesture.startX, startY: gesture.startY, startView: gesture.startView }
        setHover(null)
        setIsPanning(true)
      }
    }

    const current = gestureRef.current
    if (current.kind === 'pan') {
      setUserView(clampView({
        scale: current.startView.scale,
        x: current.startView.x + event.clientX - current.startX,
        y: current.startView.y + event.clientY - current.startY,
      }))
      return
    }

    if (current.kind === 'scrub') {
      const at = locate(event.clientX, event.clientY, true)
      setHover(at)
      if (at) sampleAt(at)
      return
    }

    if (!touch && current.kind === 'none') setHover(locate(event.clientX, event.clientY, false))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId)
    clearHoldTimer()
    const gesture = gestureRef.current
    const touch = event.pointerType === 'touch'

    if (gesture.kind === 'pinch') {
      // Hand the remaining finger a fresh pan so the picture doesn't jump.
      const [rest] = Array.from(pointersRef.current.values())
      gestureRef.current = rest
        ? { kind: 'pan', startX: rest.x, startY: rest.y, startView: view }
        : { kind: 'none' }
      setIsPanning(!!rest)
      return
    }

    if (gesture.kind === 'pending' && event.type === 'pointerup') {
      const at = locate(event.clientX, event.clientY, touch)
      if (at) sampleAt(at, true)
    }

    gestureRef.current = { kind: 'none' }
    setIsPanning(false)
    if (touch) setHover(null)
    else setHover(locate(event.clientX, event.clientY, false))
  }

  // Nearest-neighbour magnification: the loupe shows real pixels, never smoothed guesses.
  // Once the picture itself is zoomed past the loupe's magnification, the loupe steps aside.
  const loupeCell = LOUPE_SIZE / LOUPE_SPAN
  const showLoupe = !!hover && (hover.touch || view.scale < loupeCell)

  useEffect(() => {
    const loupe = loupeRef.current
    if (!loupe || !hover || !showLoupe) return
    const dpr = window.devicePixelRatio || 1
    loupe.width = LOUPE_SIZE * dpr
    loupe.height = LOUPE_SIZE * dpr
    const ctx = loupe.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false

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
    ctx.drawImage(valueView ? getValueCanvas() : source, sx, sy, sw, sh, (sx - left) * loupeCell, (sy - top) * loupeCell, sw * loupeCell, sh * loupeCell)

    // Outline exactly the pixels that get averaged into the sample.
    const edge = (half - sampleRadius) * loupeCell
    const span = (sampleRadius * 2 + 1) * loupeCell
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.strokeRect(edge, edge, span, span)
    ctx.lineWidth = 1
    ctx.strokeStyle = '#ffffff'
    ctx.strokeRect(edge, edge, span, span)
  }, [getValueCanvas, hover, loupeCell, sampleRadius, showLoupe, source, valueView])

  const loupePosition = useMemo(() => {
    if (!hover || !showLoupe) return null
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
  }, [hover, showLoupe, size])

  const zoomPercent = Math.round(view.scale * 100)

  return (
    <div ref={frameRef} className={styles.stage}>
      <canvas
        ref={canvasRef}
        className={`${styles.stageCanvas} ${isPanning ? styles.panning : ''}`}
        style={{ width: size.width, height: size.height }}
        aria-label="Your picture. Click to read a color, drag to move, scroll or pinch to zoom."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={(event) => { if (event.pointerType === 'mouse' && gestureRef.current.kind === 'none') setHover(null) }}
        onContextMenu={(event) => event.preventDefault()}
      />
      {loupePosition && (
        <canvas
          ref={loupeRef}
          className={styles.loupe}
          style={{ width: LOUPE_SIZE, height: LOUPE_SIZE, left: loupePosition.left, top: loupePosition.top }}
          aria-hidden="true"
        />
      )}
      <div className={styles.zoomControls}>
        <button type="button" onClick={() => zoomAt(view, 1 / KEY_ZOOM_STEP, size.width / 2, size.height / 2)} disabled={isFit} aria-label="Zoom out (−)">−</button>
        <button type="button" className={styles.zoomReadout} onClick={() => setUserView(null)} disabled={isFit} title="Fit to window (0)">
          {isFit ? 'Fit' : `${zoomPercent}%`}
        </button>
        <button type="button" onClick={() => zoomAt(view, KEY_ZOOM_STEP, size.width / 2, size.height / 2)} disabled={view.scale >= MAX_SCALE} aria-label="Zoom in (+)">+</button>
      </div>
    </div>
  )
}
