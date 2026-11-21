'use client'

/**
 * The picture, as an archival studio viewfinder.
 *
 * Mouse and trackpad: scroll or pinch to zoom at the cursor, drag (or hold Space + drag) to move,
 * double-click to smart-zoom, click to sample/isolate.
 * Touch: pinch to zoom, drag to move, double-tap to smart-zoom, tap to sample, hold to pick with the loupe.
 * Keys: + and − glide-zoom, 0 glides to fit, Space pans.
 *
 * Supports resolution-independent Retina vector display rendering (`renderDisplay`),
 * interactive Before/After Split Curtain (`compareSplit`), weighted camera physics with
 * pan momentum, quiet HUD recession while navigating, and an auto-hiding zoomed Mini-Navigator.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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

export interface FocusRegion {
  /** Normalized 0..1 bounding box in the picture. */
  x: number
  y: number
  width: number
  height: number
  /** Increment to re-trigger framing the same region. */
  id: number
}

export interface CanvasViewContext {
  ctx: CanvasRenderingContext2D
  stageWidth: number
  stageHeight: number
  drawX: number
  drawY: number
  drawW: number
  drawH: number
  /** CSS pixels per source image pixel. */
  scale: number
  /** Stage zoom relative to Fit (`1` = Fit, `4` = 400%). */
  zoomRatio: number
  dpr: number
  valueView: boolean
  source: HTMLCanvasElement
  /** Lazily cached full-resolution grayscale luminance canvas of `source`. */
  getValueSource: () => HTMLCanvasElement
}

export type CanvasDisplayRenderer = (view: CanvasViewContext) => void
export type CanvasNavigatorRenderer = (ctx: CanvasRenderingContext2D, width: number, height: number) => void

interface SimpleCanvasProps {
  source: HTMLCanvasElement
  /**
   * Draw this instead of the picture (the Plan view's repaint). It must have the picture's
   * proportions, at any resolution. Clicks still report the source pixel under the pointer,
   * and the loupe steps aside because it would magnify the wrong picture.
   */
  display?: HTMLCanvasElement | null
  /**
   * Optional resolution-independent renderer drawn at native Retina DPR inside the stage's
   * active camera transform (used by the vector Thread Map & Fabric Transfer Outline).
   * Takes precedence over `display` when provided.
   */
  renderDisplay?: CanvasDisplayRenderer | null
  /** Optional custom thumbnail renderer for the zoomed-in Mini-Navigator. */
  renderNavigator?: CanvasNavigatorRenderer | null
  /** Show the auto-hiding Mini-Navigator when zoomed past 165% on desktop/tablet. */
  showNavigator?: boolean
  /**
   * Optional Before/After Split Curtain position (`0..1` across the artwork width).
   * Left side shows the full-resolution original photo; right side shows `renderDisplay` / `display`.
   */
  compareSplit?: number | null
  onCompareSplitChange?: (split: number) => void
  /** Left / right labels shown quietly while dragging the Split Curtain. */
  compareLabels?: [string, string]
  /** Screen-reader description of what the canvas shows */
  label?: string
  /** Overlay controls, drawn in the stage's corner */
  children?: ReactNode
  valueView: boolean
  point: SamplePoint | null
  /** Optional bright studio stage (used by Thread Studio) with light controls and archival mat framing. */
  lightStage?: boolean
  /** Optional normalized region to frame when the user asks to zoom to a thread's stitching area. */
  focusRegion?: FocusRegion | null
  /** `origin` (client px) is set for deliberate clicks and taps, not drags, so the pick can pour in. */
  onSample: (point: SamplePoint, color: PickedColor, origin?: { x: number; y: number }) => void
  /** Lightweight mouse-hover pixel callback (null when pointer leaves or during pan/touch). */
  onHoverPixel?: (pixel: { x: number; y: number } | null) => void
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

interface PanSample {
  x: number
  y: number
  t: number
}

const STAGE_PADDING = 24
const STAGE_PADDING_NARROW = 12
const SAMPLE_RADIUS = 1
const PRECISE_SAMPLE_RADIUS = 0
const LOUPE_SIZE = 136
const LOUPE_SPAN = 17
const LOUPE_GAP = 20
const MAX_SCALE = 64
const CRISP_SCALE = 4
const DRAG_THRESHOLD_MOUSE = 4
const DRAG_THRESHOLD_TOUCH = 8
const HOLD_TO_PICK_MS = 350
const KEY_ZOOM_STEP = 1.5
const GLIDE_DURATION_MS = 280
const SMART_ZOOM_RATIO = 3.0
const DOUBLE_TAP_MS = 320
const DOUBLE_TAP_DIST = 26
const INTERACT_SETTLE_MS = 260
const NAV_MAX_SIDE = 112
const NAV_MIN_ZOOM = 1.65
const NAV_MIN_STAGE_WIDTH = 640

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A gray image whose every pixel has the same luminance as the original (preserving alpha). */
function buildValueCanvas(source: HTMLCanvasElement, pixels: ImageData) {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const out = ctx.createImageData(source.width, source.height)
  const { data } = pixels
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 128) {
      out.data[i + 3] = 0
      continue
    }
    const gray = Math.round(linearToSRGB(getRelativeLuminance(data[i], data[i + 1], data[i + 2])) * 255)
    out.data[i] = gray
    out.data[i + 1] = gray
    out.data[i + 2] = gray
    out.data[i + 3] = a
  }
  ctx.putImageData(out, 0, 0)
  return canvas
}

/** A gray copy of any canvas, by luminance (the source's is cached separately). */
function valueCanvasOf(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  return ctx ? buildValueCanvas(canvas, ctx.getImageData(0, 0, canvas.width, canvas.height)) : canvas
}

const PICTURE_LABEL = 'Your picture. Click to read a color, drag to move, scroll or pinch to zoom.'

export default function SimpleCanvas({
  source,
  display = null,
  renderDisplay = null,
  renderNavigator = null,
  showNavigator = false,
  compareSplit = null,
  onCompareSplitChange,
  compareLabels = ['Original', 'Map'],
  label = PICTURE_LABEL,
  children,
  valueView,
  point,
  lightStage = false,
  focusRegion = null,
  onSample,
  onHoverPixel,
}: SimpleCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loupeRef = useRef<HTMLCanvasElement>(null)
  const navCanvasRef = useRef<HTMLCanvasElement>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<Gesture>({ kind: 'none' })
  const holdTimerRef = useRef<number | null>(null)
  const motionRafRef = useRef<number | null>(null)
  const interactTimerRef = useRef<number | null>(null)
  const panSamplesRef = useRef<PanSample[]>([])
  const lastTapRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const navDraggingRef = useRef(false)
  const splitDraggingRef = useRef(false)

  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hover, setHover] = useState<Hover | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false)
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

  const displayValue = useMemo(() => (!renderDisplay && display && valueView ? valueCanvasOf(display) : null), [display, renderDisplay, valueView])
  /** What the stage actually draws when `renderDisplay` is not active. */
  const drawable = display ? (displayValue ?? display) : valueView ? getValueCanvas() : source

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
  const viewRef = useRef<View>(view)
  viewRef.current = view
  const isFit = userView === null
  const zoomRatio = fitView.scale > 0 ? view.scale / fitView.scale : 1
  const sampleRadius = view.scale >= CRISP_SCALE ? PRECISE_SAMPLE_RADIUS : SAMPLE_RADIUS
  const splitActive = compareSplit !== null && Boolean(renderDisplay || display)

  const cancelMotion = useCallback(() => {
    if (motionRafRef.current !== null) {
      window.cancelAnimationFrame(motionRafRef.current)
      motionRafRef.current = null
    }
  }, [])

  const pulseInteracting = useCallback(() => {
    setIsInteracting(true)
    if (interactTimerRef.current !== null) window.clearTimeout(interactTimerRef.current)
    interactTimerRef.current = window.setTimeout(() => {
      interactTimerRef.current = null
      setIsInteracting(false)
    }, INTERACT_SETTLE_MS)
  }, [])

  useEffect(() => {
    return () => {
      cancelMotion()
      if (interactTimerRef.current !== null) window.clearTimeout(interactTimerRef.current)
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    }
  }, [cancelMotion])

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

  /** Smooth optical camera glide (log-scale + linear focus interpolation). */
  const animateToView = useCallback((
    target: View | null,
    options?: { durationMs?: number; anchor?: { x: number; y: number } },
  ) => {
    cancelMotion()
    if (size.width === 0 || size.height === 0) return
    const clampedTarget = target ? clampView(target) : null
    const finalView = clampedTarget ?? fitView
    const startView = viewRef.current

    if (
      prefersReducedMotion()
      || (Math.abs(startView.scale - finalView.scale) < 1e-4
        && Math.abs(startView.x - finalView.x) < 0.5
        && Math.abs(startView.y - finalView.y) < 0.5)
    ) {
      setUserView(clampedTarget)
      return
    }

    const duration = options?.durationMs ?? GLIDE_DURATION_MS
    const anchor = options?.anchor ?? null
    const anchorImgX = anchor ? (anchor.x - startView.x) / startView.scale : 0
    const anchorImgY = anchor ? (anchor.y - startView.y) / startView.scale : 0
    const startCenterX = (size.width / 2 - startView.x) / startView.scale
    const startCenterY = (size.height / 2 - startView.y) / startView.scale
    const endCenterX = (size.width / 2 - finalView.x) / finalView.scale
    const endCenterY = (size.height / 2 - finalView.y) / finalView.scale
    const logScaleRatio = Math.log(finalView.scale / startView.scale)
    const t0 = performance.now()

    const step = (now: number) => {
      const rawT = Math.min(1, (now - t0) / duration)
      const ease = 1 - Math.pow(1 - rawT, 3)

      if (rawT >= 1) {
        motionRafRef.current = null
        setUserView(clampedTarget)
        return
      }

      const scale = startView.scale * Math.exp(logScaleRatio * ease)
      let x: number
      let y: number
      if (anchor) {
        // Keep the anchor point locked cleanly under the cursor while zooming.
        const anchoredX = anchor.x - anchorImgX * scale
        const anchoredY = anchor.y - anchorImgY * scale
        // Gently blend into clamped target bounds near the end if Fit clamps it.
        if (clampedTarget === null) {
          const icx = startCenterX + (endCenterX - startCenterX) * ease
          const icy = startCenterY + (endCenterY - startCenterY) * ease
          x = size.width / 2 - icx * scale
          y = size.height / 2 - icy * scale
        } else {
          x = anchoredX
          y = anchoredY
        }
      } else {
        const icx = startCenterX + (endCenterX - startCenterX) * ease
        const icy = startCenterY + (endCenterY - startCenterY) * ease
        x = size.width / 2 - icx * scale
        y = size.height / 2 - icy * scale
      }

      setUserView({ scale, x, y })
      motionRafRef.current = window.requestAnimationFrame(step)
    }

    motionRafRef.current = window.requestAnimationFrame(step)
  }, [cancelMotion, clampView, fitView, size])

  /** Instant cursor-anchored zoom (wheel / trackpad). */
  const zoomAt = useCallback((from: View, factor: number, localX: number, localY: number) => {
    if (size.width === 0 || size.height === 0) return
    cancelMotion()
    const scale = Math.min(MAX_SCALE, Math.max(fitView.scale, from.scale * factor))
    const ratio = scale / from.scale
    setUserView(clampView({
      scale,
      x: localX - (localX - from.x) * ratio,
      y: localY - (localY - from.y) * ratio,
    }))
  }, [cancelMotion, clampView, fitView.scale, size])

  /** Smooth optical zoom step for buttons / keyboard / double-click. */
  const glideZoomAt = useCallback((targetScale: number, localX: number, localY: number, durationMs = 240) => {
    if (size.width === 0 || size.height === 0) return
    const from = viewRef.current
    const scale = Math.min(MAX_SCALE, Math.max(fitView.scale, targetScale))
    if (scale <= fitView.scale * 1.001) {
      animateToView(null, { durationMs })
      return
    }
    const ratio = scale / from.scale
    animateToView(
      {
        scale,
        x: localX - (localX - from.x) * ratio,
        y: localY - (localY - from.y) * ratio,
      },
      { durationMs, anchor: { x: localX, y: localY } },
    )
  }, [animateToView, fitView.scale, size])

  /** Double-click / double-tap smart zoom: glide to 3× at cursor, or glide back to Fit. */
  const smartZoomAt = useCallback((localX: number, localY: number) => {
    const current = viewRef.current
    const ratio = fitView.scale > 0 ? current.scale / fitView.scale : 1
    if (ratio > 1.35) {
      animateToView(null, { durationMs: 280 })
    } else {
      glideZoomAt(fitView.scale * SMART_ZOOM_RATIO, localX, localY, 290)
    }
  }, [animateToView, fitView.scale, glideZoomAt])

  /** Subtle pan momentum on release when zoomed in. */
  const startPanMomentum = useCallback((vx: number, vy: number) => {
    if (prefersReducedMotion()) return
    const speed = Math.hypot(vx, vy)
    if (speed < 0.14) return
    cancelMotion()

    let curVx = Math.max(-2.6, Math.min(2.6, vx))
    let curVy = Math.max(-2.6, Math.min(2.6, vy))
    let lastTime = performance.now()

    const step = (now: number) => {
      const dt = Math.min(34, Math.max(4, now - lastTime))
      lastTime = now
      const decay = Math.pow(0.91, dt / 16.67)
      curVx *= decay
      curVy *= decay
      if (Math.hypot(curVx, curVy) < 0.03) {
        motionRafRef.current = null
        return
      }
      const prev = viewRef.current
      const next = clampView({
        scale: prev.scale,
        x: prev.x + curVx * dt,
        y: prev.y + curVy * dt,
      })
      if (!next || (Math.abs(next.x - prev.x) < 0.05 && Math.abs(next.y - prev.y) < 0.05)) {
        motionRafRef.current = null
        return
      }
      setUserView(next)
      motionRafRef.current = window.requestAnimationFrame(step)
    }

    motionRafRef.current = window.requestAnimationFrame(step)
  }, [cancelMotion, clampView])

  // Frame a requested normalized region smoothly inside the stage (e.g. "Zoom in" on an isolated thread).
  const lastFocusIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (!focusRegion || focusRegion.id === lastFocusIdRef.current) return
    if (size.width === 0 || size.height === 0) return
    lastFocusIdRef.current = focusRegion.id

    const rw = Math.max(0.06, focusRegion.width) * source.width
    const rh = Math.max(0.06, focusRegion.height) * source.height
    const padX = Math.max(40, size.width * 0.16)
    const padY = Math.max(56, size.height * 0.18)
    const targetScale = Math.min(
      Math.max(1, size.width - padX * 2) / rw,
      Math.max(1, size.height - padY * 2) / rh,
    )
    const maxFocusScale = Math.min(MAX_SCALE, fitView.scale * 7)
    const minFocusScale = fitView.scale * 1.15
    const scale = Math.min(maxFocusScale, Math.max(minFocusScale, targetScale))

    const cx = (focusRegion.x + focusRegion.width / 2) * source.width
    const cy = (focusRegion.y + focusRegion.height / 2) * source.height
    animateToView(
      {
        scale,
        x: size.width / 2 - cx * scale,
        y: size.height / 2 - cy * scale,
      },
      { durationMs: 320 },
    )
  }, [animateToView, fitView.scale, focusRegion, size, source])

  // Notify hover pixel changes cleanly (null when leaving, touching, or panning).
  const lastReportedHoverRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (!onHoverPixel) return
    const next = hover && !hover.touch && !isPanning ? { x: hover.x, y: hover.y } : null
    const prev = lastReportedHoverRef.current
    if (prev?.x === next?.x && prev?.y === next?.y) return
    lastReportedHoverRef.current = next
    onHoverPixel(next)
  }, [hover, isPanning, onHoverPixel])

  // Draw main high-DPI stage canvas.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width === 0) return
    const dpr = window.devicePixelRatio || 1
    const targetW = Math.round(size.width * dpr)
    const targetH = Math.round(size.height * dpr)
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW
      canvas.height = targetH
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.width, size.height)
    const drawW = source.width * view.scale
    const drawH = source.height * view.scale

    if (lightStage) {
      // Multi-layered archival gallery shadow so the plate floats gently off the studio mat.
      ctx.save()
      ctx.shadowColor = 'rgba(17, 17, 17, 0.08)'
      ctx.shadowBlur = 32
      ctx.shadowOffsetY = 12
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(view.x, view.y, drawW, drawH)
      ctx.shadowColor = 'rgba(17, 17, 17, 0.09)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 2
      ctx.fillRect(view.x, view.y, drawW, drawH)
      ctx.restore()
    }

    const drawOverlay = () => {
      if (renderDisplay) {
        renderDisplay({
          ctx,
          stageWidth: size.width,
          stageHeight: size.height,
          drawX: view.x,
          drawY: view.y,
          drawW,
          drawH,
          scale: view.scale,
          zoomRatio,
          dpr,
          valueView,
          source,
          getValueSource: getValueCanvas,
        })
      } else {
        ctx.imageSmoothingEnabled = view.scale < CRISP_SCALE
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(drawable, view.x, view.y, drawW, drawH)
      }
    }

    if (splitActive && compareSplit !== null) {
      const splitX = view.x + drawW * compareSplit
      // Left side: full-resolution original photo (or its grayscale values).
      ctx.save()
      ctx.beginPath()
      ctx.rect(view.x, view.y, Math.max(0, splitX - view.x), drawH)
      ctx.clip()
      ctx.imageSmoothingEnabled = view.scale < CRISP_SCALE
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(valueView ? getValueCanvas() : source, view.x, view.y, drawW, drawH)
      ctx.restore()

      // Right side: active vector Thread Map / Outline / Plan display.
      ctx.save()
      ctx.beginPath()
      ctx.rect(splitX, view.y, Math.max(0, view.x + drawW - splitX), drawH)
      ctx.clip()
      drawOverlay()
      ctx.restore()
    } else {
      drawOverlay()
    }

    if (lightStage) {
      // Crisp 1 px archival keyline framing the artwork edge.
      ctx.save()
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.09)'
      ctx.lineWidth = 1
      ctx.strokeRect(view.x + 0.5, view.y + 0.5, Math.max(0, drawW - 1), Math.max(0, drawH - 1))
      ctx.restore()
    }

    if (point) {
      const cx = view.x + (point.x + 0.5) * view.scale
      const cy = view.y + (point.y + 0.5) * view.scale
      const half = view.scale * (point.radius + 0.5)
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.beginPath()
      if (half >= 8) {
        ctx.rect(cx - half, cy - half, half * 2, half * 2)
      } else {
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      }
      ctx.stroke()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    }
  }, [
    compareSplit,
    drawable,
    getValueCanvas,
    lightStage,
    point,
    renderDisplay,
    size,
    source,
    splitActive,
    valueView,
    view,
    zoomRatio,
  ])

  // Auto-hiding Mini-Navigator dimensions & live rendering.
  const navVisible = showNavigator && zoomRatio >= NAV_MIN_ZOOM && size.width >= NAV_MIN_STAGE_WIDTH
  const navSize = useMemo(() => {
    const aspect = source.width / Math.max(1, source.height)
    if (aspect >= 1) {
      return { width: NAV_MAX_SIDE, height: Math.max(44, Math.round(NAV_MAX_SIDE / aspect)) }
    }
    return { width: Math.max(44, Math.round(NAV_MAX_SIDE * aspect)), height: NAV_MAX_SIDE }
  }, [source.height, source.width])

  useEffect(() => {
    if (!navVisible) return
    const nav = navCanvasRef.current
    if (!nav) return
    const dpr = window.devicePixelRatio || 1
    const targetW = Math.round(navSize.width * dpr)
    const targetH = Math.round(navSize.height * dpr)
    if (nav.width !== targetW || nav.height !== targetH) {
      nav.width = targetW
      nav.height = targetH
    }
    const ctx = nav.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, navSize.width, navSize.height)

    if (renderNavigator) {
      renderNavigator(ctx, navSize.width, navSize.height)
    } else {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(drawable, 0, 0, navSize.width, navSize.height)
    }

    // Draw live viewport indicator box.
    const vx0 = Math.max(0, Math.min(1, -view.x / (source.width * view.scale)))
    const vy0 = Math.max(0, Math.min(1, -view.y / (source.height * view.scale)))
    const vx1 = Math.max(0, Math.min(1, (size.width - view.x) / (source.width * view.scale)))
    const vy1 = Math.max(0, Math.min(1, (size.height - view.y) / (source.height * view.scale)))
    const rx = vx0 * navSize.width
    const ry = vy0 * navSize.height
    const rw = Math.max(8, (vx1 - vx0) * navSize.width)
    const rh = Math.max(8, (vy1 - vy0) * navSize.height)

    // Subtle veil outside active viewport so focus area pops immediately.
    ctx.save()
    ctx.fillStyle = 'rgba(17, 17, 17, 0.22)'
    ctx.beginPath()
    ctx.rect(0, 0, navSize.width, navSize.height)
    ctx.rect(rx, ry, rw, rh)
    ctx.fill('evenodd')

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.lineWidth = 2.5
    ctx.strokeRect(rx + 0.5, ry + 0.5, Math.max(1, rw - 1), Math.max(1, rh - 1))
    ctx.strokeStyle = '#111111'
    ctx.lineWidth = 1.15
    ctx.strokeRect(rx + 0.5, ry + 0.5, Math.max(1, rw - 1), Math.max(1, rh - 1))
    ctx.restore()
  }, [drawable, navSize, navVisible, renderNavigator, size.height, size.width, source.height, source.width, view])

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect()
    return bounds ? { localX: clientX - bounds.left, localY: clientY - bounds.top } : null
  }, [])

  const locate = useCallback((clientX: number, clientY: number, touch: boolean): Hover | null => {
    const local = toLocal(clientX, clientY)
    if (!local) return null
    const current = viewRef.current
    const x = Math.floor((local.localX - current.x) / current.scale)
    const y = Math.floor((local.localY - current.y) / current.scale)
    if (x < 0 || y < 0 || x >= source.width || y >= source.height) return null
    return { x, y, ...local, touch }
  }, [source, toLocal])

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
      pulseInteracting()
      const lines = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1
      const sensitivity = event.ctrlKey ? 0.01 : 0.0018
      zoomAt(viewRef.current, Math.exp(-event.deltaY * lines * sensitivity), local.localX, local.localY)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [pulseInteracting, toLocal, zoomAt])

  // + and − glide-zoom around the middle; 0 glides to fit; Space enables grab-to-pan.
  useEffect(() => {
    const isEditable = (target: HTMLElement) =>
      target.tagName === 'INPUT'
      || target.tagName === 'TEXTAREA'
      || target.isContentEditable
      || target.getAttribute('role') === 'slider'

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (isEditable(target)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === '+' || event.key === '=') {
        glideZoomAt(viewRef.current.scale * KEY_ZOOM_STEP, size.width / 2, size.height / 2, 200)
      } else if (event.key === '-' || event.key === '_') {
        glideZoomAt(viewRef.current.scale / KEY_ZOOM_STEP, size.width / 2, size.height / 2, 200)
      } else if (event.key === '0') {
        animateToView(null, { durationMs: 260 })
      } else if (event.code === 'Space' && !event.repeat && target.tagName !== 'BUTTON') {
        event.preventDefault()
        setSpacePressed(true)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePressed(false)
    }
    const onBlur = () => setSpacePressed(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [animateToView, glideZoomAt, size])

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
      startView: viewRef.current,
    }
  }

  const recordPanSample = (x: number, y: number) => {
    const now = performance.now()
    const samples = panSamplesRef.current
    samples.push({ x, y, t: now })
    while (samples.length > 5) samples.shift()
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1) return
    cancelMotion()
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
      setIsInteracting(true)
      beginPinch()
      return
    }
    if (pointersRef.current.size > 2) return

    if (event.button === 1 || spacePressed) {
      panSamplesRef.current = [{ x: event.clientX, y: event.clientY, t: performance.now() }]
      gestureRef.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, startView: viewRef.current }
      setIsPanning(true)
      setIsInteracting(true)
      return
    }

    panSamplesRef.current = [{ x: event.clientX, y: event.clientY, t: performance.now() }]
    gestureRef.current = { kind: 'pending', startX: event.clientX, startY: event.clientY, startView: viewRef.current, touch }
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
        setIsInteracting(true)
      }
    }

    const current = gestureRef.current
    if (current.kind === 'pan') {
      recordPanSample(event.clientX, event.clientY)
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
      const [rest] = Array.from(pointersRef.current.values())
      gestureRef.current = rest
        ? { kind: 'pan', startX: rest.x, startY: rest.y, startView: viewRef.current }
        : { kind: 'none' }
      setIsPanning(!!rest)
      if (!rest) setIsInteracting(false)
      return
    }

    if (gesture.kind === 'pan' && event.type === 'pointerup') {
      const samples = panSamplesRef.current
      const now = performance.now()
      const recent = samples.filter((s) => now - s.t <= 80)
      if (recent.length >= 2) {
        const first = recent[0]
        const last = recent[recent.length - 1]
        const dt = last.t - first.t
        if (dt >= 8 && now - last.t <= 45) {
          startPanMomentum((last.x - first.x) / dt, (last.y - first.y) / dt)
        }
      }
    }

    if (gesture.kind === 'pending' && event.type === 'pointerup') {
      const local = toLocal(event.clientX, event.clientY)
      const now = performance.now()
      const prevTap = lastTapRef.current
      const isDoubleTap = Boolean(
        prevTap
        && now - prevTap.t <= DOUBLE_TAP_MS
        && Math.hypot(event.clientX - prevTap.x, event.clientY - prevTap.y) <= DOUBLE_TAP_DIST,
      )
      if (isDoubleTap && local) {
        lastTapRef.current = null
        smartZoomAt(local.localX, local.localY)
      } else {
        lastTapRef.current = { x: event.clientX, y: event.clientY, t: now }
        const at = locate(event.clientX, event.clientY, touch)
        if (at) sampleAt(at, true)
      }
    }

    gestureRef.current = { kind: 'none' }
    setIsPanning(false)
    setIsInteracting(false)
    if (touch) setHover(null)
    else setHover(locate(event.clientX, event.clientY, false))
  }

  // Mini-Navigator click / drag camera scrubbing.
  const panFromNavigator = useCallback((clientX: number, clientY: number, animate: boolean) => {
    const nav = navCanvasRef.current
    if (!nav) return
    const rect = nav.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const current = viewRef.current
    const target: View = {
      scale: current.scale,
      x: size.width / 2 - nx * source.width * current.scale,
      y: size.height / 2 - ny * source.height * current.scale,
    }
    if (animate) animateToView(target, { durationMs: 220 })
    else {
      cancelMotion()
      setUserView(clampView(target))
    }
  }, [animateToView, cancelMotion, clampView, size.height, size.width, source.height, source.width])

  // Split Curtain pointer drag & keyboard scrubbing.
  const updateSplitFromClientX = useCallback((clientX: number) => {
    if (!onCompareSplitChange) return
    const local = toLocal(clientX, 0)
    if (!local) return
    const current = viewRef.current
    const drawW = source.width * current.scale
    if (drawW <= 0) return
    const next = Math.max(0.02, Math.min(0.98, (local.localX - current.x) / drawW))
    onCompareSplitChange(next)
  }, [onCompareSplitChange, source.width, toLocal])

  // Nearest-neighbour magnification: the loupe shows real pixels, never smoothed guesses.
  const loupeCell = LOUPE_SIZE / LOUPE_SPAN
  const showLoupe = !display && !renderDisplay && !!hover && (hover.touch || view.scale < loupeCell)

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
    const sx = Math.max(0, left)
    const sy = Math.max(0, top)
    const sw = Math.min(source.width, left + LOUPE_SPAN) - sx
    const sh = Math.min(source.height, top + LOUPE_SPAN) - sy

    ctx.fillStyle = '#777777'
    ctx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
    ctx.drawImage(valueView ? getValueCanvas() : source, sx, sy, sw, sh, (sx - left) * loupeCell, (sy - top) * loupeCell, sw * loupeCell, sh * loupeCell)

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
      return {
        left: Math.min(Math.max(0, hover.localX - LOUPE_SIZE / 2), size.width - LOUPE_SIZE),
        top: Math.max(0, hover.localY - LOUPE_SIZE - LOUPE_GAP * 2.5),
      }
    }
    const right = hover.localX + LOUPE_GAP + LOUPE_SIZE <= size.width
    const above = hover.localY - LOUPE_GAP - LOUPE_SIZE >= 0
    return {
      left: right ? hover.localX + LOUPE_GAP : hover.localX - LOUPE_GAP - LOUPE_SIZE,
      top: above ? hover.localY - LOUPE_GAP - LOUPE_SIZE : hover.localY + LOUPE_GAP,
    }
  }, [hover, showLoupe, size])

  const zoomPercent = fitView.scale > 0 ? Math.round(zoomRatio * 100) : 100

  // Split Curtain screen geometry (clamped to visible stage vertical span).
  const splitGeometry = useMemo(() => {
    if (!splitActive || compareSplit === null || size.width === 0 || size.height === 0) return null
    const drawW = source.width * view.scale
    const drawH = source.height * view.scale
    const x = view.x + drawW * compareSplit
    if (x < -16 || x > size.width + 16) return null
    const top = Math.max(0, view.y)
    const bottom = Math.min(size.height, view.y + drawH)
    if (bottom - top < 24) return null
    return { x, top, height: bottom - top }
  }, [compareSplit, size.height, size.width, source.height, source.width, splitActive, view.scale, view.x, view.y])

  return (
    <div
      ref={frameRef}
      className={`${styles.stage} ${lightStage ? styles.stageLight : ''}`}
      data-interacting={isInteracting || isDraggingSplit ? 'true' : undefined}
    >
      <canvas
        ref={canvasRef}
        className={`${styles.stageCanvas} ${isPanning ? styles.panning : spacePressed ? styles.grabReady : ''}`}
        style={{ width: size.width, height: size.height }}
        aria-label={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={(event) => { if (event.pointerType === 'mouse' && gestureRef.current.kind === 'none') setHover(null) }}
        onContextMenu={(event) => event.preventDefault()}
      />

      {splitGeometry && compareSplit !== null && onCompareSplitChange && (
        <div
          className={`${styles.splitCurtain} ${isDraggingSplit ? styles.splitCurtainActive : ''}`}
          style={{ left: splitGeometry.x, top: splitGeometry.top, height: splitGeometry.height }}
          role="slider"
          tabIndex={0}
          aria-label="Compare original photo and map"
          aria-valuemin={2}
          aria-valuemax={98}
          aria-valuenow={Math.round(compareSplit * 100)}
          aria-valuetext={`${Math.round(compareSplit * 100)}% original`}
          onPointerDown={(event) => {
            event.stopPropagation()
            cancelMotion()
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              /* optional capture */
            }
            splitDraggingRef.current = true
            setIsDraggingSplit(true)
            setHover(null)
            updateSplitFromClientX(event.clientX)
          }}
          onPointerMove={(event) => {
            if (!splitDraggingRef.current) return
            event.stopPropagation()
            updateSplitFromClientX(event.clientX)
          }}
          onPointerUp={(event) => {
            if (!splitDraggingRef.current) return
            event.stopPropagation()
            splitDraggingRef.current = false
            setIsDraggingSplit(false)
          }}
          onPointerCancel={() => {
            splitDraggingRef.current = false
            setIsDraggingSplit(false)
          }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.1 : 0.02
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              onCompareSplitChange(Math.max(0.02, compareSplit - step))
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              onCompareSplitChange(Math.min(0.98, compareSplit + step))
            }
          }}
        >
          <span className={styles.splitLine} aria-hidden="true" />
          <span className={styles.splitLabels} aria-hidden="true">
            <span className={styles.splitLabelLeft}>{compareLabels[0]}</span>
            <span className={styles.splitLabelRight}>{compareLabels[1]}</span>
          </span>
          <span className={styles.splitGrip} aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <path d="M5.75 4.25L2.5 8l3.25 3.75M10.25 4.25L13.5 8l-3.25 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      )}

      {navVisible && (
        <div className={styles.miniNavigator} aria-label="Zoom navigator">
          <canvas
            ref={navCanvasRef}
            className={styles.miniNavigatorCanvas}
            style={{ width: navSize.width, height: navSize.height }}
            onPointerDown={(event) => {
              event.stopPropagation()
              try {
                event.currentTarget.setPointerCapture(event.pointerId)
              } catch {
                /* optional capture */
              }
              navDraggingRef.current = true
              setIsInteracting(true)
              panFromNavigator(event.clientX, event.clientY, true)
            }}
            onPointerMove={(event) => {
              if (!navDraggingRef.current) return
              event.stopPropagation()
              panFromNavigator(event.clientX, event.clientY, false)
            }}
            onPointerUp={(event) => {
              if (!navDraggingRef.current) return
              event.stopPropagation()
              navDraggingRef.current = false
              setIsInteracting(false)
            }}
            onPointerCancel={() => {
              navDraggingRef.current = false
              setIsInteracting(false)
            }}
          />
        </div>
      )}

      {loupePosition && (
        <canvas
          ref={loupeRef}
          className={styles.loupe}
          style={{ width: LOUPE_SIZE, height: LOUPE_SIZE, left: loupePosition.left, top: loupePosition.top }}
          aria-hidden="true"
        />
      )}
      {children}
      <div className={styles.zoomControls}>
        <button
          type="button"
          onClick={() => glideZoomAt(view.scale / KEY_ZOOM_STEP, size.width / 2, size.height / 2, 200)}
          disabled={isFit}
          aria-label="Zoom out (−)"
        >
          −
        </button>
        <button
          type="button"
          className={styles.zoomReadout}
          onClick={() => animateToView(null, { durationMs: 260 })}
          disabled={isFit}
          title="Fit to window (0)"
        >
          {isFit ? 'Fit' : `${zoomPercent}%`}
        </button>
        <button
          type="button"
          onClick={() => glideZoomAt(view.scale * KEY_ZOOM_STEP, size.width / 2, size.height / 2, 200)}
          disabled={view.scale >= MAX_SCALE}
          aria-label="Zoom in (+)"
        >
          +
        </button>
      </div>
    </div>
  )
}
