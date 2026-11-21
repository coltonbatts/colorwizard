'use client'

/**
 * Infinite-zoom Retina vector renderer for the Painterly DMC Thread Map and
 * B&W Fabric Transfer Outline inside `SimpleCanvas`.
 *
 * Compiles watertight smoothed topological arcs into cached `Path2D` objects once per
 * `ThreadMapResult`, then renders at native `devicePixelRatio` under the stage's live
 * camera transform:
 * - Zero 512 px upscaling blur or stair-stepping at any zoom level.
 * - Full-resolution warm-vellum photo backdrop when isolating a thread (with Tracing / Photo / Paper modes).
 * - Constant screen-space hairline ink strokes for transfer outlines, isolation rims, and hover highlights.
 * - Native Retina screen-space number badges (never pixelated, never flipped when mirrored).
 */

import {
  extractBinaryMaskGeometry,
  extractThreadMapGeometry,
  traceArc,
  traceSlotLoops,
  type ThreadMapVectorGeometry,
} from '@/lib/dmc/map/contours'
import type { ThreadMapResult } from '@/lib/dmc/map/types'
import type { LabelPlacement } from '@/lib/paint/plan/labels'
import { getRelativeLuminance, linearToSRGB } from '@/lib/valueScale'
import type { CanvasDisplayRenderer, CanvasNavigatorRenderer } from './SimpleCanvas'

export type VellumMode = 'tracing' | 'photo' | 'paper'

export interface CompiledThreadMapPaths {
  geometry: ThreadMapVectorGeometry
  slotFillPaths: Path2D[]
  slotInteriorBoundaryPaths: Path2D[]
  slotRimPaths: Path2D[]
  allInteriorOutlinePath: Path2D
  getVisiblyOffPath: () => Path2D | null
}

export interface OutlineLabelSet {
  radius: number
  placed: LabelPlacement
}

export interface ThreadMapCanvasOptions {
  outline: boolean
  mirror: boolean
  showNumbers: boolean
  outlineLabels: OutlineLabelSet | null
  selected: number | null
  hovered?: number | null
  vellumMode?: VellumMode
  markMisses: boolean
}

const CRISP_PHOTO_SCALE = 4
const VELLUM_PAPER = '#f8f7f3'
const OUTLINE_PAPER = '#ffffff'
const OUTLINE_INK = '#1b1a18'
const OUTLINE_FOCUS_INK = '#111111'
const OUTLINE_MUTED_INK = '#ccc8c0'
const OUTLINE_FOCUS_TINT = '#f2f0ea'

function luminanceHex(r: number, g: number, b: number): string {
  const gray = Math.round(linearToSRGB(getRelativeLuminance(r, g, b)) * 255)
  const h = gray.toString(16).padStart(2, '0')
  return `#${h}${h}${h}`
}

function darkenedRgb(r: number, g: number, b: number, factor: number): string {
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
}

function vellumPhotoAlpha(mode: VellumMode): number {
  if (mode === 'paper') return 0
  if (mode === 'photo') return 0.56
  return 0.26
}

let cachedHatchCanvas: HTMLCanvasElement | null = null

function getHatchPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (!cachedHatchCanvas && typeof document !== 'undefined') {
    const tile = document.createElement('canvas')
    // 2x Retina tile (16x16 backing -> 8x8 CSS px repeating pattern).
    tile.width = 16
    tile.height = 16
    const tctx = tile.getContext('2d')
    if (tctx) {
      tctx.strokeStyle = 'rgba(17, 17, 17, 0.44)'
      tctx.lineWidth = 2
      tctx.beginPath()
      tctx.moveTo(-4, 12)
      tctx.lineTo(12, -4)
      tctx.moveTo(4, 20)
      tctx.lineTo(20, 4)
      tctx.stroke()
    }
    cachedHatchCanvas = tile
  }
  if (!cachedHatchCanvas) return null
  const pattern = ctx.createPattern(cachedHatchCanvas, 'repeat')
  if (pattern && typeof DOMMatrix !== 'undefined' && typeof pattern.setTransform === 'function') {
    pattern.setTransform(new DOMMatrix().scale(0.5, 0.5))
  }
  return pattern
}

/**
 * Compiles a `ThreadMapResult` into cached `Path2D` objects once per computed map.
 * Safe to memoize with `useMemo` on `[threadMap]`.
 */
export function compileThreadMapPaths(map: ThreadMapResult): CompiledThreadMapPaths | null {
  if (typeof Path2D === 'undefined') return null

  const geometry = extractThreadMapGeometry(map.slot, map.width, map.height, map.slots.length)
  const { arcs, slotLoops, slotCount } = geometry

  const slotFillPaths: Path2D[] = []
  const slotInteriorBoundaryPaths: Path2D[] = []
  const slotRimPaths: Path2D[] = []

  for (let s = 0; s < slotCount; s++) {
    const fill = new Path2D()
    traceSlotLoops(fill, slotLoops[s], arcs)
    slotFillPaths.push(fill)
    slotInteriorBoundaryPaths.push(new Path2D())
    slotRimPaths.push(new Path2D())
  }

  const allInteriorOutlinePath = new Path2D()
  for (let i = 0; i < arcs.length; i++) {
    const arc = arcs[i]
    const rSlot = arc.rightSlot
    const lSlot = arc.leftSlot

    if (!arc.onFrame) {
      traceArc(allInteriorOutlinePath, arc, true, true)
      if (rSlot < slotCount) traceArc(slotInteriorBoundaryPaths[rSlot], arc, true, true)
      if (lSlot < slotCount && lSlot !== rSlot) traceArc(slotInteriorBoundaryPaths[lSlot], arc, true, true)
    }

    if (rSlot < slotCount) traceArc(slotRimPaths[rSlot], arc, true, true)
    if (lSlot < slotCount && lSlot !== rSlot) traceArc(slotRimPaths[lSlot], arc, true, true)
  }

  let visiblyOffComputed = false
  let visiblyOffPath: Path2D | null = null
  const getVisiblyOffPath = () => {
    if (!visiblyOffComputed) {
      visiblyOffComputed = true
      let anyOff = false
      for (let i = 0; i < map.visiblyOff.length; i++) {
        if (map.visiblyOff[i]) { anyOff = true; break }
      }
      if (anyOff) {
        const maskGeom = extractBinaryMaskGeometry(map.visiblyOff, map.width, map.height)
        if (maskGeom.slotLoops[0] && maskGeom.slotLoops[0].length > 0) {
          const p = new Path2D()
          traceSlotLoops(p, maskGeom.slotLoops[0], maskGeom.arcs)
          visiblyOffPath = p
        }
      }
    }
    return visiblyOffPath
  }

  return {
    geometry,
    slotFillPaths,
    slotInteriorBoundaryPaths,
    slotRimPaths,
    allInteriorOutlinePath,
    getVisiblyOffPath,
  }
}

/**
 * Builds a `CanvasDisplayRenderer` callback for `SimpleCanvas` that renders the Thread Map
 * or Fabric Transfer Outline at infinite vector crispness and native Retina resolution.
 */
export function createThreadMapCanvasRenderer(
  map: ThreadMapResult,
  compiled: CompiledThreadMapPaths,
  options: ThreadMapCanvasOptions,
): CanvasDisplayRenderer {
  const {
    outline,
    mirror,
    showNumbers,
    outlineLabels,
    selected,
    hovered = null,
    vellumMode = 'tracing',
    markMisses,
  } = options
  const validSelected = selected !== null && selected >= 0 && selected < map.slots.length ? selected : null
  const validHovered = hovered !== null && hovered >= 0 && hovered < map.slots.length && hovered !== validSelected
    ? hovered
    : null

  return ({
    ctx,
    stageWidth,
    stageHeight,
    drawX,
    drawY,
    drawW,
    drawH,
    scale,
    zoomRatio,
    dpr,
    valueView,
    getValueSource,
  }) => {
    const mapScaleX = drawW / map.width
    const mapScaleY = drawH / map.height
    const mapScale = Math.min(mapScaleX, mapScaleY)
    if (mapScale <= 0) return

    ctx.save()
    ctx.beginPath()
    ctx.rect(drawX, drawY, drawW, drawH)
    ctx.clip()

    if (outline) {
      // Crisp white archival paper background for Fabric Transfer Outline.
      ctx.fillStyle = OUTLINE_PAPER
      ctx.fillRect(drawX, drawY, drawW, drawH)

      ctx.save()
      if (mirror) {
        ctx.translate(drawX + drawW, drawY)
        ctx.scale(-mapScaleX, mapScaleY)
      } else {
        ctx.translate(drawX, drawY)
        ctx.scale(mapScaleX, mapScaleY)
      }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Screen-space hairline weight: delicate at Fit, slightly richer when zoomed deeply.
      const zoomEase = Math.min(1, Math.max(0, Math.log2(Math.max(1, zoomRatio)) / 3))
      const baseScreenStroke = 1.15 + zoomEase * 0.3

      if (validHovered !== null) {
        ctx.fillStyle = 'rgba(17, 17, 17, 0.05)'
        ctx.fill(compiled.slotFillPaths[validHovered], 'evenodd')
      }

      if (validSelected !== null) {
        ctx.fillStyle = OUTLINE_FOCUS_TINT
        ctx.fill(compiled.slotFillPaths[validSelected], 'evenodd')

        ctx.strokeStyle = OUTLINE_MUTED_INK
        ctx.lineWidth = (0.9 + zoomEase * 0.2) / mapScale
        ctx.stroke(compiled.allInteriorOutlinePath)

        ctx.strokeStyle = OUTLINE_FOCUS_INK
        ctx.lineWidth = (1.75 + zoomEase * 0.35) / mapScale
        ctx.stroke(compiled.slotInteriorBoundaryPaths[validSelected])
      } else {
        ctx.strokeStyle = OUTLINE_INK
        ctx.lineWidth = baseScreenStroke / mapScale
        ctx.stroke(compiled.allInteriorOutlinePath)
      }

      if (validHovered !== null) {
        ctx.strokeStyle = 'rgba(17, 17, 17, 0.52)'
        ctx.lineWidth = (1.55 + zoomEase * 0.25) / mapScale
        ctx.stroke(compiled.slotInteriorBoundaryPaths[validHovered])
      }
      ctx.restore()

      // Native Retina screen-space number badges (never pixelated, never flipped when mirrored).
      if (showNumbers && outlineLabels && outlineLabels.placed.labels.length > 0) {
        const naturalR = outlineLabels.radius * mapScale
        const screenR = Math.min(13.5, Math.max(7, naturalR * 0.85))
        const fontSize = Math.max(8, Math.round(screenR * 1.16 * 10) / 10)
        const strokeW = Math.max(1, Math.min(1.4, screenR * 0.13))

        ctx.save()
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        for (const label of outlineLabels.placed.labels) {
          const mx = mirror ? map.width - (label.x + 0.5) : label.x + 0.5
          const my = label.y + 0.5
          const cx = drawX + mx * mapScaleX
          const cy = drawY + my * mapScaleY
          if (cx < -24 || cx > stageWidth + 24 || cy < -24 || cy > stageHeight + 24) continue

          const isFocus = validSelected === null || label.pile === validSelected
          ctx.beginPath()
          ctx.arc(cx, cy, screenR, 0, Math.PI * 2)
          ctx.fillStyle = isFocus ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.74)'
          ctx.fill()
          ctx.lineWidth = strokeW
          ctx.strokeStyle = isFocus ? 'rgba(27, 26, 24, 0.78)' : 'rgba(150, 147, 140, 0.48)'
          ctx.stroke()
          ctx.fillStyle = isFocus ? OUTLINE_INK : 'rgba(120, 118, 112, 0.55)'
          ctx.fillText(String(label.pile + 1), cx, cy + 0.5)
        }
        ctx.restore()
      }

      ctx.restore()
      return
    }

    if (validSelected !== null) {
      // Isolated stitch view: full-resolution warm-vellum photo backdrop + crisp vector thread shape.
      const photoAlpha = vellumPhotoAlpha(vellumMode)
      if (!compiled.geometry.hasTransparency) {
        ctx.fillStyle = VELLUM_PAPER
        ctx.fillRect(drawX, drawY, drawW, drawH)
      }
      if (photoAlpha > 0) {
        ctx.save()
        ctx.globalAlpha = photoAlpha
        ctx.imageSmoothingEnabled = scale < CRISP_PHOTO_SCALE
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(getValueSource(), drawX, drawY, drawW, drawH)
        ctx.restore()
      }

      const activeSlot = map.slots[validSelected]
      const { r, g, b } = activeSlot.thread.rgb
      const fillColor = valueView ? luminanceHex(r, g, b) : activeSlot.thread.hex
      const isLight = activeSlot.thread.oklab.L > 0.62

      ctx.save()
      ctx.translate(drawX, drawY)
      ctx.scale(mapScaleX, mapScaleY)
      ctx.fillStyle = fillColor
      ctx.fill(compiled.slotFillPaths[validSelected], 'evenodd')

      const zoomEase = Math.min(1, Math.max(0, Math.log2(Math.max(1, zoomRatio)) / 3))
      const rimScreenWidth = 1.25 + zoomEase * 0.45
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.lineWidth = rimScreenWidth / mapScale
      ctx.strokeStyle = isLight
        ? 'rgba(34, 32, 30, 0.8)'
        : valueView
          ? darkenedRgb(
            Math.round(linearToSRGB(getRelativeLuminance(r, g, b)) * 255),
            Math.round(linearToSRGB(getRelativeLuminance(r, g, b)) * 255),
            Math.round(linearToSRGB(getRelativeLuminance(r, g, b)) * 255),
            0.52,
          )
          : darkenedRgb(r, g, b, 0.54)
      ctx.stroke(compiled.slotRimPaths[validSelected])

      if (validHovered !== null) {
        ctx.strokeStyle = 'rgba(17, 17, 17, 0.28)'
        ctx.lineWidth = 1.1 / mapScale
        ctx.stroke(compiled.slotRimPaths[validHovered])
      }
      ctx.restore()

      ctx.restore()
      return
    }

    // All-threads Painterly Map view: smooth watertight vector fills with zero seam bleed.
    ctx.save()
    ctx.translate(drawX, drawY)
    ctx.scale(mapScaleX, mapScaleY)
    ctx.lineJoin = 'round'

    const slotCount = map.slots.length
    let lastActive = -1
    for (let i = slotCount - 1; i >= 0; i--) {
      if (map.slots[i].area > 0) { lastActive = i; break }
    }
    const seamWidth = 0.85 / mapScale
    for (let i = 0; i < slotCount; i++) {
      const slot = map.slots[i]
      if (slot.area <= 0) continue
      const { r, g, b } = slot.thread.rgb
      const color = valueView ? luminanceHex(r, g, b) : slot.thread.hex
      const path = compiled.slotFillPaths[i]

      if (i < lastActive) {
        // Sub-pixel same-color overlap seals Canvas2D AA conflation seams without widening edges.
        ctx.strokeStyle = color
        ctx.lineWidth = seamWidth
        ctx.stroke(path)
      }
      ctx.fillStyle = color
      ctx.fill(path, 'evenodd')
    }

    // Crisp screen-space diagonal hatching for visibly-off color gaps (> 5 ΔE00).
    if (markMisses && map.mode === 'full-color') {
      const offPath = compiled.getVisiblyOffPath()
      if (offPath) {
        const pattern = getHatchPattern(ctx)
        if (pattern) {
          ctx.save()
          ctx.clip(offPath, 'evenodd')
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.fillStyle = pattern
          ctx.fillRect(drawX, drawY, drawW, drawH)
          ctx.restore()
        }
      }
    }

    // Quiet luminous dual-tone contour highlight on the hovered region so selection feels tactile.
    if (validHovered !== null) {
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)'
      ctx.lineWidth = 2.4 / mapScale
      ctx.stroke(compiled.slotRimPaths[validHovered])
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.44)'
      ctx.lineWidth = 1.0 / mapScale
      ctx.stroke(compiled.slotRimPaths[validHovered])
      ctx.restore()
    }

    ctx.restore()
    ctx.restore()
  }
}

/**
 * Lightweight mini-navigator renderer for `SimpleCanvas` when zoomed in on a Thread Map:
 * highlights the isolated thread's full composition footprint so you can spot remaining regions at a glance.
 */
export function createThreadMapNavigatorRenderer(
  map: ThreadMapResult,
  compiled: CompiledThreadMapPaths,
  options: { outline: boolean; mirror: boolean; selected: number | null },
): CanvasNavigatorRenderer {
  const { outline, mirror, selected } = options
  const validSelected = selected !== null && selected >= 0 && selected < map.slots.length ? selected : null

  return (ctx, width, height) => {
    const sx = width / map.width
    const sy = height / map.height
    const s = Math.min(sx, sy)
    if (s <= 0) return

    ctx.save()
    ctx.fillStyle = outline ? OUTLINE_PAPER : VELLUM_PAPER
    ctx.fillRect(0, 0, width, height)

    if (outline && mirror) {
      ctx.translate(width, 0)
      ctx.scale(-sx, sy)
    } else {
      ctx.scale(sx, sy)
    }

    if (outline) {
      if (validSelected !== null) {
        ctx.fillStyle = '#e7e4dc'
        ctx.fill(compiled.slotFillPaths[validSelected], 'evenodd')
        ctx.strokeStyle = 'rgba(27, 26, 24, 0.25)'
        ctx.lineWidth = 0.7 / s
        ctx.stroke(compiled.allInteriorOutlinePath)
        ctx.strokeStyle = OUTLINE_FOCUS_INK
        ctx.lineWidth = 1.2 / s
        ctx.stroke(compiled.slotInteriorBoundaryPaths[validSelected])
      } else {
        ctx.strokeStyle = OUTLINE_INK
        ctx.lineWidth = 0.85 / s
        ctx.stroke(compiled.allInteriorOutlinePath)
      }
      ctx.restore()
      return
    }

    if (validSelected !== null) {
      // Softly tint non-selected silhouette for spatial context, then glow the active thread.
      ctx.fillStyle = 'rgba(17, 17, 17, 0.08)'
      for (let i = 0; i < map.slots.length; i++) {
        if (i !== validSelected && map.slots[i].area > 0) {
          ctx.fill(compiled.slotFillPaths[i], 'evenodd')
        }
      }
      const active = map.slots[validSelected]
      ctx.fillStyle = active.thread.hex
      ctx.fill(compiled.slotFillPaths[validSelected], 'evenodd')
      ctx.strokeStyle = active.thread.oklab.L > 0.62 ? 'rgba(27, 26, 24, 0.85)' : 'rgba(17, 17, 17, 0.4)'
      ctx.lineWidth = 1.1 / s
      ctx.stroke(compiled.slotRimPaths[validSelected])
    } else {
      for (let i = 0; i < map.slots.length; i++) {
        if (map.slots[i].area <= 0) continue
        ctx.fillStyle = map.slots[i].thread.hex
        ctx.fill(compiled.slotFillPaths[i], 'evenodd')
      }
    }

    ctx.restore()
  }
}
