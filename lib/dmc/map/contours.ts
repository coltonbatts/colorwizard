/**
 * Pure, deterministic topological arc vectorizer for Painterly DMC Thread Maps.
 *
 * Converts a discrete per-pixel slot map into a watertight graph of shared, Taubin-smoothed
 * boundary arcs and closed per-slot loops. Because adjacent regions reference the exact same
 * smoothed arcs (one forward, one reversed) with reverse-symmetric quadratic B-splines:
 * - Region fills meet with zero gaps or overlaps at any zoom level (Fit to 6400%).
 * - Fabric Transfer Outlines stroke every interior boundary exactly once (zero double lines).
 * - Isolated thread rims stay constant-width hairlines at native display / printer resolution.
 *
 * Zero dependencies, React-free, Canvas-free.
 */

import { DEFAULT_THREAD_MAP_DETAIL, NO_THREAD, type ThreadMapDetail, type ThreadMapResult } from './types'

/** Direction indices on the pixel corner lattice (screen coords: +X right, +Y down). */
const DIR_E = 0
const DIR_S = 1
const DIR_W = 2
const DIR_N = 3

const DX = [1, 0, -1, 0] as const
const DY = [0, 1, 0, -1] as const
const POPCOUNT4 = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4] as const

/** Volume-preserving Taubin smoothing coefficients (kills 1px staircases without shrinking circles). */
const TAUBIN_LAMBDA = 0.5
const TAUBIN_MU = -0.53

interface ContourProfile {
  taubinPasses: number
  /** Max displacement from original grid vertex (< 0.5 guarantees 1px-thin regions never self-cross). */
  maxVertexDrift: number
  /** Douglas-Peucker simplification tolerance in map pixels. */
  simplifyEpsilon: number
  /** Long simplified segments above this length get symmetric corner anchors so straight runs never bow. */
  maxCurveSegment: number
  cornerAnchorOffset: number
}

const CONTOUR_PROFILES: Record<ThreadMapDetail, ContourProfile> = {
  crisp: {
    taubinPasses: 1,
    maxVertexDrift: 0.28,
    simplifyEpsilon: 0.08,
    maxCurveSegment: 3.0,
    cornerAnchorOffset: 1.0,
  },
  painterly: {
    taubinPasses: 3,
    maxVertexDrift: 0.44,
    simplifyEpsilon: 0.14,
    maxCurveSegment: 4.0,
    cornerAnchorOffset: 1.5,
  },
  broad: {
    taubinPasses: 4,
    maxVertexDrift: 0.46,
    simplifyEpsilon: 0.24,
    maxCurveSegment: 5.5,
    cornerAnchorOffset: 1.8,
  },
}

export interface VectorArc {
  /** Interleaved `[x0, y0, x1, y1, ...]` coordinates in map pixel space (`0..width`, `0..height`). */
  points: Float32Array
  /** True for isolated closed loops with no junctions (`points` does NOT repeat the first point). */
  isClosed: boolean
  /** True if this arc runs along the outer rectangular image frame (`x=0, x=W, y=0, y=H`). */
  onFrame: boolean
  /** Slot index on the right-hand side when traversing forward (`0 → end`), or `NO_THREAD`. */
  rightSlot: number
  /** Slot index on the left-hand side when traversing forward (`0 → end`), or `NO_THREAD`. */
  leftSlot: number
  startVertex: number
  endVertex: number
  startDir: number
  endDir: number
}

export interface SlotArcRef {
  arcIndex: number
  forward: boolean
}

export interface SlotLoop {
  arcs: SlotArcRef[]
}

export interface ThreadMapVectorGeometry {
  width: number
  height: number
  slotCount: number
  arcs: VectorArc[]
  /** Per-slot closed contours (`slotLoops[slotIndex]`) suitable for `evenodd` fill. */
  slotLoops: SlotLoop[][]
  /** True when the map contains transparent (`NO_THREAD`) pixels inside `[0, width) × [0, height)`. */
  hasTransparency: boolean
}

export interface CurveSink {
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  closePath(): void
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/**
 * Volume-preserving Taubin smoothing on a polyline in map coordinates.
 * Preserves endpoints on open arcs, pins coordinates on the outer image frame,
 * and clamps vertex drift to `MAX_VERTEX_DRIFT` so narrow features never self-intersect.
 */
function smoothPolyline(
  raw: number[],
  isClosed: boolean,
  width: number,
  height: number,
  profile: ContourProfile,
): Float32Array {
  const n = raw.length / 2
  const orig = new Float32Array(raw)
  if ((!isClosed && n <= 2) || (isClosed && n < 3)) return orig

  const cur = new Float32Array(orig)
  const tmp = new Float32Array(orig.length)
  const passes = isClosed && n <= 6 ? 1 : profile.taubinPasses
  const maxDrift = profile.maxVertexDrift

  const step = (src: Float32Array, dst: Float32Array, factor: number) => {
    if (isClosed) {
      for (let i = 0; i < n; i++) {
        const prev = ((i - 1 + n) % n) * 2
        const idx = i * 2
        const next = ((i + 1) % n) * 2
        const avgX = (src[prev] + src[next]) * 0.5
        const avgY = (src[prev + 1] + src[next + 1]) * 0.5
        const ox = orig[idx]
        const oy = orig[idx + 1]
        const nx = ox === 0 || ox === width
          ? ox
          : clamp(src[idx] + factor * (avgX - src[idx]), Math.max(0, ox - maxDrift), Math.min(width, ox + maxDrift))
        const ny = oy === 0 || oy === height
          ? oy
          : clamp(src[idx + 1] + factor * (avgY - src[idx + 1]), Math.max(0, oy - maxDrift), Math.min(height, oy + maxDrift))
        dst[idx] = nx
        dst[idx + 1] = ny
      }
    } else {
      dst[0] = orig[0]
      dst[1] = orig[1]
      const last = (n - 1) * 2
      dst[last] = orig[last]
      dst[last + 1] = orig[last + 1]
      for (let i = 1; i < n - 1; i++) {
        const prev = (i - 1) * 2
        const idx = i * 2
        const next = (i + 1) * 2
        const avgX = (src[prev] + src[next]) * 0.5
        const avgY = (src[prev + 1] + src[next + 1]) * 0.5
        const ox = orig[idx]
        const oy = orig[idx + 1]
        const nx = ox === 0 || ox === width
          ? ox
          : clamp(src[idx] + factor * (avgX - src[idx]), Math.max(0, ox - maxDrift), Math.min(width, ox + maxDrift))
        const ny = oy === 0 || oy === height
          ? oy
          : clamp(src[idx + 1] + factor * (avgY - src[idx + 1]), Math.max(0, oy - maxDrift), Math.min(height, oy + maxDrift))
        dst[idx] = nx
        dst[idx + 1] = ny
      }
    }
  }

  for (let p = 0; p < passes; p++) {
    step(cur, tmp, TAUBIN_LAMBDA)
    step(tmp, cur, TAUBIN_MU)
  }

  return cur
}

function pointSegDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq <= 1e-12) {
    const ex = px - ax
    const ey = py - ay
    return ex * ex + ey * ey
  }
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1)
  const cx = ax + t * dx
  const cy = ay + t * dy
  const ex = px - cx
  const ey = py - cy
  return ex * ex + ey * ey
}

/** Iterative Douglas-Peucker simplification for an open polyline. */
function simplifyOpen(pts: Float32Array, epsilon: number): Float32Array {
  const n = pts.length / 2
  if (n <= 2) return pts

  const epsSq = epsilon * epsilon
  const keep = new Uint8Array(n)
  keep[0] = 1
  keep[n - 1] = 1

  const stack: number[] = [0, n - 1]
  while (stack.length > 0) {
    const end = stack.pop()!
    const start = stack.pop()!
    if (end - start <= 1) continue

    const ax = pts[start * 2]
    const ay = pts[start * 2 + 1]
    const bx = pts[end * 2]
    const by = pts[end * 2 + 1]

    let maxDistSq = -1
    let bestIdx = -1
    for (let i = start + 1; i < end; i++) {
      const dSq = pointSegDistSq(pts[i * 2], pts[i * 2 + 1], ax, ay, bx, by)
      if (dSq > maxDistSq) {
        maxDistSq = dSq
        bestIdx = i
      }
    }

    if (bestIdx >= 0 && maxDistSq > epsSq) {
      keep[bestIdx] = 1
      stack.push(start, bestIdx, bestIdx, end)
    }
  }

  let keptCount = 0
  for (let i = 0; i < n; i++) if (keep[i]) keptCount++
  const out = new Float32Array(keptCount * 2)
  let o = 0
  for (let i = 0; i < n; i++) {
    if (!keep[i]) continue
    out[o++] = pts[i * 2]
    out[o++] = pts[i * 2 + 1]
  }
  return out
}

/** Simplifies a closed loop by splitting at the two farthest vertices so it stays symmetric. */
function simplifyClosed(pts: Float32Array, epsilon: number): Float32Array {
  const n = pts.length / 2
  if (n <= 6) return pts

  const x0 = pts[0]
  const y0 = pts[1]
  let farIdx = 1
  let farDistSq = -1
  for (let i = 1; i < n; i++) {
    const dx = pts[i * 2] - x0
    const dy = pts[i * 2 + 1] - y0
    const dSq = dx * dx + dy * dy
    if (dSq > farDistSq) {
      farDistSq = dSq
      farIdx = i
    }
  }

  // First half: 0 .. farIdx
  const halfA = new Float32Array((farIdx + 1) * 2)
  for (let i = 0; i <= farIdx; i++) {
    halfA[i * 2] = pts[i * 2]
    halfA[i * 2 + 1] = pts[i * 2 + 1]
  }
  // Second half: farIdx .. n-1, 0
  const lenB = n - farIdx + 1
  const halfB = new Float32Array(lenB * 2)
  for (let i = 0; i < lenB - 1; i++) {
    const srcIdx = farIdx + i
    halfB[i * 2] = pts[srcIdx * 2]
    halfB[i * 2 + 1] = pts[srcIdx * 2 + 1]
  }
  halfB[(lenB - 1) * 2] = x0
  halfB[(lenB - 1) * 2 + 1] = y0

  const simA = simplifyOpen(halfA, epsilon)
  const simB = simplifyOpen(halfB, epsilon)
  const countA = simA.length / 2
  const countB = simB.length / 2
  // Drop duplicated endpoints at farIdx and 0.
  const total = countA + countB - 2
  if (total < 4) return pts

  const out = new Float32Array(total * 2)
  let o = 0
  for (let i = 0; i < countA; i++) {
    out[o++] = simA[i * 2]
    out[o++] = simA[i * 2 + 1]
  }
  for (let i = 1; i < countB - 1; i++) {
    out[o++] = simB[i * 2]
    out[o++] = simB[i * 2 + 1]
  }
  return out
}

/**
 * Inserts symmetric corner-anchor points on long simplified segments (`> MAX_CURVE_SEGMENT`)
 * so quadratic B-spline rendering keeps straight runs dead-straight while preserving tight,
 * reverse-symmetric organic bends at corners.
 */
function insertCornerAnchors(
  pts: Float32Array,
  isClosed: boolean,
  profile: ContourProfile,
): Float32Array {
  const n = pts.length / 2
  if ((!isClosed && n <= 2) || (isClosed && n < 3)) return pts

  const segCount = isClosed ? n : n - 1
  const maxSq = profile.maxCurveSegment * profile.maxCurveSegment
  let needsAnchors = false
  for (let i = 0; i < segCount; i++) {
    const j = isClosed ? (i + 1) % n : i + 1
    const dx = pts[j * 2] - pts[i * 2]
    const dy = pts[j * 2 + 1] - pts[i * 2 + 1]
    if (dx * dx + dy * dy > maxSq) {
      needsAnchors = true
      break
    }
  }
  if (!needsAnchors) return pts

  const out: number[] = []
  for (let i = 0; i < segCount; i++) {
    const j = isClosed ? (i + 1) % n : i + 1
    const ax = pts[i * 2]
    const ay = pts[i * 2 + 1]
    const bx = pts[j * 2]
    const by = pts[j * 2 + 1]
    out.push(ax, ay)

    const dx = bx - ax
    const dy = by - ay
    const lenSq = dx * dx + dy * dy
    if (lenSq > maxSq) {
      const len = Math.sqrt(lenSq)
      const t = profile.cornerAnchorOffset / len
      out.push(ax + dx * t, ay + dy * t)
      out.push(bx - dx * t, by - dy * t)
    }
  }
  if (!isClosed) {
    out.push(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1])
  }
  return new Float32Array(out)
}

/**
 * Extracts watertight, smoothed topological arcs and per-slot closed loops from a discrete slot map.
 */
export function extractThreadMapGeometry(
  slot: Uint8Array,
  width: number,
  height: number,
  slotCount: number,
  detail: ThreadMapDetail = DEFAULT_THREAD_MAP_DETAIL,
): ThreadMapVectorGeometry {
  const profile = CONTOUR_PROFILES[detail] ?? CONTOUR_PROFILES.painterly
  if (width <= 0 || height <= 0 || slotCount <= 0) {
    return { width, height, slotCount, arcs: [], slotLoops: [], hasTransparency: false }
  }

  let hasTransparency = false
  for (let i = 0; i < width * height; i++) {
    if (slot[i] === NO_THREAD) {
      hasTransparency = true
      break
    }
  }

  const slotAt = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return NO_THREAD
    const s = slot[y * width + x]
    return s < slotCount ? s : NO_THREAD
  }

  const vStride = width + 1
  const vCount = vStride * (height + 1)
  // Bitmask per vertex of incident boundary unit edges (bits 0..3 = E, S, W, N).
  const vMask = new Uint8Array(vCount)
  // Bitmask per vertex of incident ON-FRAME boundary edges (bits 0..3 = E, S, W, N).
  const vFrameMask = new Uint8Array(vCount)

  // Horizontal unit edges: hPresent[y * width + x] for 0 <= x < width, 0 <= y <= height.
  const hPresent = new Uint8Array(width * (height + 1))
  // Vertical unit edges: vPresent[y * vStride + x] for 0 <= x <= width, 0 <= y < height.
  const vPresent = new Uint8Array(vStride * height)

  for (let y = 0; y <= height; y++) {
    const onFrame = y === 0 || y === height
    const rowH = y * width
    const rowV = y * vStride
    for (let x = 0; x < width; x++) {
      const top = slotAt(x, y - 1)
      const bot = slotAt(x, y)
      if (top !== bot) {
        hPresent[rowH + x] = 1
        const vL = rowV + x
        const vR = vL + 1
        vMask[vL] |= 1 << DIR_E
        vMask[vR] |= 1 << DIR_W
        if (onFrame) {
          vFrameMask[vL] |= 1 << DIR_E
          vFrameMask[vR] |= 1 << DIR_W
        }
      }
    }
  }

  for (let y = 0; y < height; y++) {
    const rowV = y * vStride
    for (let x = 0; x <= width; x++) {
      const onFrame = x === 0 || x === width
      const left = slotAt(x - 1, y)
      const right = slotAt(x, y)
      if (left !== right) {
        vPresent[rowV + x] = 1
        const vT = rowV + x
        const vB = vT + vStride
        vMask[vT] |= 1 << DIR_S
        vMask[vB] |= 1 << DIR_N
        if (onFrame) {
          vFrameMask[vT] |= 1 << DIR_S
          vFrameMask[vB] |= 1 << DIR_N
        }
      }
    }
  }

  // Determine pinned junction nodes:
  // - degree !== 2 (T/X-junctions, saddles, dead-ends)
  // - image outer corners (0,0), (W,0), (W,H), (0,H)
  // - any vertex touching both an on-frame edge and an interior edge
  const isNode = new Uint8Array(vCount)
  for (let v = 0; v < vCount; v++) {
    const m = vMask[v]
    if (m === 0) continue
    const deg = POPCOUNT4[m]
    const fm = vFrameMask[v]
    if (deg !== 2 || (fm !== 0 && fm !== m)) {
      isNode[v] = 1
    }
  }
  if (vMask[0]) isNode[0] = 1
  if (vMask[width]) isNode[width] = 1
  if (vMask[height * vStride]) isNode[height * vStride] = 1
  if (vMask[height * vStride + width]) isNode[height * vStride + width] = 1

  const hVisited = new Uint8Array(hPresent.length)
  const vVisited = new Uint8Array(vPresent.length)

  const isEdgeVisited = (vx: number, vy: number, dir: number): boolean => {
    if (dir === DIR_E) return hVisited[vy * width + vx] !== 0
    if (dir === DIR_W) return hVisited[vy * width + (vx - 1)] !== 0
    if (dir === DIR_S) return vVisited[vy * vStride + vx] !== 0
    return vVisited[(vy - 1) * vStride + vx] !== 0
  }

  const markEdgeVisited = (vx: number, vy: number, dir: number) => {
    if (dir === DIR_E) hVisited[vy * width + vx] = 1
    else if (dir === DIR_W) hVisited[vy * width + (vx - 1)] = 1
    else if (dir === DIR_S) vVisited[vy * vStride + vx] = 1
    else vVisited[(vy - 1) * vStride + vx] = 1
  }

  const edgeLabels = (vx: number, vy: number, dir: number): [number, number] => {
    // Returns [rightSlot, leftSlot] when stepping from (vx, vy) in `dir`.
    if (dir === DIR_E) return [slotAt(vx, vy), slotAt(vx, vy - 1)]
    if (dir === DIR_W) return [slotAt(vx - 1, vy - 1), slotAt(vx - 1, vy)]
    if (dir === DIR_S) return [slotAt(vx - 1, vy), slotAt(vx, vy)]
    return [slotAt(vx, vy - 1), slotAt(vx - 1, vy - 1)]
  }

  const isEdgeOnFrame = (vx: number, vy: number, dir: number): boolean => {
    if (dir === DIR_E || dir === DIR_W) return vy === 0 || vy === height
    return vx === 0 || vx === width
  }

  const arcs: VectorArc[] = []

  const buildArc = (
    rawPts: number[],
    isClosed: boolean,
    onFrame: boolean,
    rightSlot: number,
    leftSlot: number,
    startVertex: number,
    endVertex: number,
    startDir: number,
    endDir: number,
  ): VectorArc => {
    let points: Float32Array
    if (onFrame) {
      // Straight line along the outer image frame: keep exact start and end coordinates only.
      const last = rawPts.length - 2
      points = new Float32Array([rawPts[0], rawPts[1], rawPts[last], rawPts[last + 1]])
    } else {
      const smoothed = smoothPolyline(rawPts, isClosed, width, height, profile)
      const simplified = isClosed
        ? simplifyClosed(smoothed, profile.simplifyEpsilon)
        : simplifyOpen(smoothed, profile.simplifyEpsilon)
      points = insertCornerAnchors(simplified, isClosed, profile)
    }

    return {
      points,
      isClosed,
      onFrame,
      rightSlot,
      leftSlot,
      startVertex,
      endVertex,
      startDir,
      endDir,
    }
  }

  // Pass 1: Trace all open arcs starting from pinned junction nodes.
  for (let vy = 0; vy <= height; vy++) {
    const rowV = vy * vStride
    for (let vx = 0; vx <= width; vx++) {
      const startV = rowV + vx
      if (!isNode[startV]) continue
      const mask = vMask[startV]
      for (let d = 0; d < 4; d++) {
        if ((mask & (1 << d)) === 0) continue
        if (isEdgeVisited(vx, vy, d)) continue

        const [rightSlot, leftSlot] = edgeLabels(vx, vy, d)
        const onFrame = isEdgeOnFrame(vx, vy, d)
        const raw: number[] = [vx, vy]

        let cx = vx
        let cy = vy
        let dir = d
        markEdgeVisited(cx, cy, dir)
        cx += DX[dir]
        cy += DY[dir]
        raw.push(cx, cy)

        let curV = cy * vStride + cx
        while (!isNode[curV]) {
          const backBit = 1 << ((dir + 2) & 3)
          const rem = vMask[curV] & ~backBit
          const nextDir = rem === 1 ? 0 : rem === 2 ? 1 : rem === 4 ? 2 : 3
          markEdgeVisited(cx, cy, nextDir)
          dir = nextDir
          cx += DX[dir]
          cy += DY[dir]
          raw.push(cx, cy)
          curV = cy * vStride + cx
        }

        arcs.push(buildArc(raw, false, onFrame, rightSlot, leftSlot, startV, curV, d, dir))
      }
    }
  }

  // Pass 2: Trace remaining closed loops (all vertices degree 2, no pinned junctions).
  for (let y = 0; y <= height; y++) {
    const rowH = y * width
    for (let x = 0; x < width; x++) {
      if (!hPresent[rowH + x] || hVisited[rowH + x]) continue
      const startV = y * vStride + x
      const d = DIR_E
      const [rightSlot, leftSlot] = edgeLabels(x, y, d)
      const onFrame = isEdgeOnFrame(x, y, d)
      const raw: number[] = [x, y]

      let cx = x
      let cy = y
      let dir = d
      markEdgeVisited(cx, cy, dir)
      cx += DX[dir]
      cy += DY[dir]

      let curV = cy * vStride + cx
      while (curV !== startV) {
        raw.push(cx, cy)
        const backBit = 1 << ((dir + 2) & 3)
        const rem = vMask[curV] & ~backBit
        const nextDir = rem === 1 ? 0 : rem === 2 ? 1 : rem === 4 ? 2 : 3
        markEdgeVisited(cx, cy, nextDir)
        dir = nextDir
        cx += DX[dir]
        cy += DY[dir]
        curV = cy * vStride + cx
      }

      arcs.push(buildArc(raw, true, onFrame, rightSlot, leftSlot, startV, startV, d, dir))
    }
  }

  // Pass 3: Assemble closed loops per slot from directed half-arcs.
  interface HalfArc {
    arcIndex: number
    forward: boolean
    startVertex: number
    endVertex: number
    startDir: number
    endDir: number
  }

  const slotLoops: SlotLoop[][] = Array.from({ length: slotCount }, () => [])
  const slotHalfArcs: HalfArc[][] = Array.from({ length: slotCount }, () => [])

  for (let arcIndex = 0; arcIndex < arcs.length; arcIndex++) {
    const arc = arcs[arcIndex]
    if (arc.isClosed) {
      if (arc.rightSlot !== NO_THREAD && arc.rightSlot < slotCount) {
        slotLoops[arc.rightSlot].push({ arcs: [{ arcIndex, forward: true }] })
      }
      if (arc.leftSlot !== NO_THREAD && arc.leftSlot < slotCount) {
        slotLoops[arc.leftSlot].push({ arcs: [{ arcIndex, forward: false }] })
      }
      continue
    }

    if (arc.rightSlot !== NO_THREAD && arc.rightSlot < slotCount) {
      slotHalfArcs[arc.rightSlot].push({
        arcIndex,
        forward: true,
        startVertex: arc.startVertex,
        endVertex: arc.endVertex,
        startDir: arc.startDir,
        endDir: arc.endDir,
      })
    }
    if (arc.leftSlot !== NO_THREAD && arc.leftSlot < slotCount) {
      slotHalfArcs[arc.leftSlot].push({
        arcIndex,
        forward: false,
        startVertex: arc.endVertex,
        endVertex: arc.startVertex,
        startDir: (arc.endDir + 2) & 3,
        endDir: (arc.startDir + 2) & 3,
      })
    }
  }

  for (let s = 0; s < slotCount; s++) {
    const halfArcs = slotHalfArcs[s]
    if (halfArcs.length === 0) continue

    const outgoing = new Map<number, number[]>()
    for (let i = 0; i < halfArcs.length; i++) {
      const sv = halfArcs[i].startVertex
      const list = outgoing.get(sv)
      if (list) list.push(i)
      else outgoing.set(sv, [i])
    }

    const used = new Uint8Array(halfArcs.length)
    for (let startIdx = 0; startIdx < halfArcs.length; startIdx++) {
      if (used[startIdx]) continue
      const loopRefs: SlotArcRef[] = []
      const loopStartVertex = halfArcs[startIdx].startVertex
      let cur = startIdx

      while (!used[cur]) {
        used[cur] = 1
        const h = halfArcs[cur]
        loopRefs.push({ arcIndex: h.arcIndex, forward: h.forward })

        const nextV = h.endVertex
        const candidates = outgoing.get(nextV)
        if (!candidates || candidates.length === 0) break

        // Right-turn preference cleanly resolves checkerboard saddles without self-crossing:
        // right turn, straight, left turn, u-turn.
        const pref0 = (h.endDir + 1) & 3
        const pref1 = h.endDir
        const pref2 = (h.endDir + 3) & 3
        const pref3 = (h.endDir + 2) & 3

        let bestNext = -1
        let bestRank = 99
        for (let c = 0; c < candidates.length; c++) {
          const candIdx = candidates[c]
          if (used[candIdx] && candIdx !== startIdx) continue
          const dir = halfArcs[candIdx].startDir
          const rank = dir === pref0 ? 0 : dir === pref1 ? 1 : dir === pref2 ? 2 : dir === pref3 ? 3 : 4
          if (rank < bestRank) {
            bestRank = rank
            bestNext = candIdx
          }
        }

        if (bestNext === -1 || bestNext === startIdx || (nextV === loopStartVertex && used[bestNext])) {
          break
        }
        cur = bestNext
      }

      if (loopRefs.length > 0) {
        slotLoops[s].push({ arcs: loopRefs })
      }
    }
  }

  return { width, height, slotCount, arcs, slotLoops, hasTransparency }
}

/**
 * Emits an arc's smoothed curve segments to `sink` using reverse-symmetric quadratic B-splines.
 * When `moveFirst` is true, begins with `moveTo`; inside a multi-arc loop, set `moveFirst` to
 * false after the first arc since the previous arc ended at the exact pinned junction vertex.
 */
export function traceArc(
  sink: CurveSink,
  arc: VectorArc,
  forward = true,
  moveFirst = true,
): void {
  const pts = arc.points
  const n = pts.length / 2
  if (n < 2) return

  if (arc.isClosed) {
    if (n === 2) {
      sink.moveTo(pts[0], pts[1])
      sink.lineTo(pts[2], pts[3])
      sink.closePath()
      return
    }
    if (forward) {
      const startX = (pts[(n - 1) * 2] + pts[0]) * 0.5
      const startY = (pts[(n - 1) * 2 + 1] + pts[1]) * 0.5
      sink.moveTo(startX, startY)
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        const cx = pts[i * 2]
        const cy = pts[i * 2 + 1]
        sink.quadraticCurveTo(cx, cy, (cx + pts[next * 2]) * 0.5, (cy + pts[next * 2 + 1]) * 0.5)
      }
    } else {
      const startX = (pts[0] + pts[(n - 1) * 2]) * 0.5
      const startY = (pts[1] + pts[(n - 1) * 2 + 1]) * 0.5
      sink.moveTo(startX, startY)
      for (let i = n - 1; i >= 0; i--) {
        const next = (i - 1 + n) % n
        const cx = pts[i * 2]
        const cy = pts[i * 2 + 1]
        sink.quadraticCurveTo(cx, cy, (cx + pts[next * 2]) * 0.5, (cy + pts[next * 2 + 1]) * 0.5)
      }
    }
    sink.closePath()
    return
  }

  // Open arc: starts at pinned vertex `p_first` and ends at pinned vertex `p_last`.
  if (arc.onFrame || n === 2) {
    if (forward) {
      if (moveFirst) sink.moveTo(pts[0], pts[1])
      sink.lineTo(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1])
    } else {
      if (moveFirst) sink.moveTo(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1])
      sink.lineTo(pts[0], pts[1])
    }
    return
  }

  if (forward) {
    if (moveFirst) sink.moveTo(pts[0], pts[1])
    for (let i = 1; i < n - 2; i++) {
      const cx = pts[i * 2]
      const cy = pts[i * 2 + 1]
      sink.quadraticCurveTo(cx, cy, (cx + pts[(i + 1) * 2]) * 0.5, (cy + pts[(i + 1) * 2 + 1]) * 0.5)
    }
    const lastCtrl = (n - 2) * 2
    const lastEnd = (n - 1) * 2
    sink.quadraticCurveTo(pts[lastCtrl], pts[lastCtrl + 1], pts[lastEnd], pts[lastEnd + 1])
  } else {
    if (moveFirst) sink.moveTo(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1])
    for (let i = n - 2; i > 1; i--) {
      const cx = pts[i * 2]
      const cy = pts[i * 2 + 1]
      sink.quadraticCurveTo(cx, cy, (cx + pts[(i - 1) * 2]) * 0.5, (cy + pts[(i - 1) * 2 + 1]) * 0.5)
    }
    sink.quadraticCurveTo(pts[2], pts[3], pts[0], pts[1])
  }
}

/** Emits every loop of a slot onto `sink`. */
export function traceSlotLoops(
  sink: CurveSink,
  loops: readonly SlotLoop[],
  arcs: readonly VectorArc[],
): void {
  for (let li = 0; li < loops.length; li++) {
    const refs = loops[li].arcs
    if (refs.length === 0) continue
    if (refs.length === 1 && arcs[refs[0].arcIndex].isClosed) {
      traceArc(sink, arcs[refs[0].arcIndex], refs[0].forward, true)
      continue
    }
    for (let ri = 0; ri < refs.length; ri++) {
      traceArc(sink, arcs[refs[ri].arcIndex], refs[ri].forward, ri === 0)
    }
    sink.closePath()
  }
}

function fmtCoord(v: number): string {
  const rounded = Math.round(v * 10) / 10
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

function createSvgPathSink(): { sink: CurveSink; toString(): string } {
  const parts: string[] = []
  return {
    sink: {
      moveTo(x, y) {
        parts.push(`M${fmtCoord(x)} ${fmtCoord(y)}`)
      },
      lineTo(x, y) {
        parts.push(`L${fmtCoord(x)} ${fmtCoord(y)}`)
      },
      quadraticCurveTo(cpx, cpy, x, y) {
        parts.push(`Q${fmtCoord(cpx)} ${fmtCoord(cpy)} ${fmtCoord(x)} ${fmtCoord(y)}`)
      },
      closePath() {
        parts.push('Z')
      },
    },
    toString() {
      return parts.join('')
    },
  }
}

/** Builds an SVG path `d` string for a single slot's filled regions (`fill-rule="evenodd"`). */
export function slotLoopsToSvgPath(
  loops: readonly SlotLoop[],
  arcs: readonly VectorArc[],
): string {
  const out = createSvgPathSink()
  traceSlotLoops(out.sink, loops, arcs)
  return out.toString()
}

/** Builds a single SVG path `d` string stroking every interior boundary arc exactly once. */
export function interiorOutlineToSvgPath(geometry: ThreadMapVectorGeometry): string {
  const out = createSvgPathSink()
  for (let i = 0; i < geometry.arcs.length; i++) {
    const arc = geometry.arcs[i]
    if (arc.onFrame) continue
    traceArc(out.sink, arc, true, true)
  }
  return out.toString()
}

export interface SlotNeighbor {
  /** 0-based index of the bordering thread slot. */
  slotIndex: number
  /** Total shared interior boundary length in map pixels along touching vector arcs. */
  sharedLength: number
}

function arcPolylineLength(points: Float32Array, isClosed: boolean): number {
  const count = points.length / 2
  if (count < 2) return 0
  let total = 0
  for (let i = 1; i < count; i++) {
    total += Math.hypot(points[i * 2] - points[(i - 1) * 2], points[i * 2 + 1] - points[(i - 1) * 2 + 1])
  }
  if (isClosed) {
    total += Math.hypot(points[0] - points[(count - 1) * 2], points[1] - points[(count - 1) * 2 + 1])
  }
  return total
}

/**
 * Finds all slots that physically border `slotIndex` along interior arcs in the watertight
 * contour graph, ordered by longest shared boundary first (ties broken by slot index).
 */
export function getSlotNeighbors(
  geometry: ThreadMapVectorGeometry,
  slotIndex: number,
): SlotNeighbor[] {
  if (slotIndex < 0 || slotIndex >= geometry.slotCount) return []
  const lengths = new Float64Array(geometry.slotCount)

  for (let i = 0; i < geometry.arcs.length; i++) {
    const arc = geometry.arcs[i]
    if (arc.onFrame) continue
    let other = NO_THREAD
    if (arc.rightSlot === slotIndex) other = arc.leftSlot
    else if (arc.leftSlot === slotIndex) other = arc.rightSlot
    else continue

    if (other === NO_THREAD || other === slotIndex || other < 0 || other >= geometry.slotCount) continue
    lengths[other] += arcPolylineLength(arc.points, arc.isClosed)
  }

  const neighbors: SlotNeighbor[] = []
  for (let s = 0; s < geometry.slotCount; s++) {
    if (lengths[s] > 0) {
      neighbors.push({ slotIndex: s, sharedLength: lengths[s] })
    }
  }
  neighbors.sort((a, b) => b.sharedLength - a.sharedLength || a.slotIndex - b.slotIndex)
  return neighbors
}

/** Builds an SVG path `d` string for all arcs bordering `slotIndex`. */
export function slotBoundaryToSvgPath(
  geometry: ThreadMapVectorGeometry,
  slotIndex: number,
  includeFrame = false,
): string {
  const out = createSvgPathSink()
  for (let i = 0; i < geometry.arcs.length; i++) {
    const arc = geometry.arcs[i]
    if (!includeFrame && arc.onFrame) continue
    if (arc.rightSlot === slotIndex || arc.leftSlot === slotIndex) {
      traceArc(out.sink, arc, true, true)
    }
  }
  return out.toString()
}

/**
 * Extracts vector geometry for a binary mask (e.g. `visiblyOff`, where `1` is inside and `0` is outside).
 */
export function extractBinaryMaskGeometry(
  mask: Uint8Array,
  width: number,
  height: number,
): ThreadMapVectorGeometry {
  const binary = new Uint8Array(width * height)
  for (let i = 0; i < binary.length; i++) {
    binary[i] = mask[i] ? 0 : NO_THREAD
  }
  return extractThreadMapGeometry(binary, width, height, 1)
}

/**
 * Generates a self-contained, infinite-DPI vector SVG document for the B&W Fabric Transfer Outline.
 */
export function buildThreadMapOutlineSvg(
  map: ThreadMapResult,
  mirror = false,
  geometry?: ThreadMapVectorGeometry,
): string {
  const geom = geometry ?? extractThreadMapGeometry(map.slot, map.width, map.height, map.slots.length, map.detail)
  const d = interiorOutlineToSvgPath(geom)
  const strokeWidth = fmtCoord(Math.max(0.55, Math.min(1.35, Math.max(map.width, map.height) / 560)))
  const pathEl = d
    ? `<path d="${d}" fill="none" stroke="#1b1a18" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
    : ''
  const body = mirror
    ? `<g transform="translate(${map.width} 0) scale(-1 1)">${pathEl}</g>`
    : pathEl

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${map.width} ${map.height}" width="${map.width}" height="${map.height}"><rect width="${map.width}" height="${map.height}" fill="#ffffff"/>${body}</svg>`
}

/**
 * Generates a self-contained, infinite-DPI vector SVG document for the Painterly Color Map.
 * Each slot except the topmost uses a hairline same-color seam-seal stroke so PDF/browser
 * anti-aliasing never leaks background color along shared vector curves.
 */
export function buildThreadMapColorSvg(
  map: ThreadMapResult,
  geometry?: ThreadMapVectorGeometry,
): string {
  const geom = geometry ?? extractThreadMapGeometry(map.slot, map.width, map.height, map.slots.length, map.detail)
  const seamWidth = fmtCoord(Math.max(0.45, Math.min(0.9, Math.max(map.width, map.height) / 700)))
  const paths: string[] = []
  for (let i = 0; i < map.slots.length; i++) {
    const loops = geom.slotLoops[i]
    if (!loops || loops.length === 0) continue
    const d = slotLoopsToSvgPath(loops, geom.arcs)
    if (!d) continue
    const hex = map.slots[i].thread.hex
    const seamAttr = i < map.slots.length - 1
      ? ` stroke="${hex}" stroke-width="${seamWidth}" stroke-linejoin="round"`
      : ''
    paths.push(`<path d="${d}" fill="${hex}" fill-rule="evenodd"${seamAttr}/>`)
  }
  const clipId = 'tm-frame'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${map.width} ${map.height}" width="${map.width}" height="${map.height}"><defs><clipPath id="${clipId}"><rect width="${map.width}" height="${map.height}"/></clipPath></defs><g clip-path="url(#${clipId})">${paths.join('')}</g></svg>`
}
