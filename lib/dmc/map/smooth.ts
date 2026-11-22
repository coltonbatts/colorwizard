/**
 * Pure, deterministic edge-preserving spatial smoothing and small-island cleanup
 * for Painterly DMC Thread Maps.
 *
 * Eliminates unstitchable pixel confetti and jagged 1px fringes while preserving strong
 * luminance and color boundaries so both the color repaint and the B&W Fabric Transfer
 * Outline stay clean and stitchable.
 *
 * React-free and Web-Worker safe.
 */

import type { DMCThread } from '../types'
import { NO_THREAD, type ThreadMapDetail } from './types'

interface DetailConfig {
  /** Number of 3x3 joint-bilateral majority passes. */
  bilateralPasses: number
  /** Color range sigma (0..255 perceptual RGB scale) for edge-preserving voting. */
  sigmaColor: number
  /** Center pixel self-weight multiplier (>1 resists flipping, <1 simplifies more). */
  centerBias: number
  /** Hard minimum island size (at 512x512 reference): smaller specks always merge. */
  minHardRef: number
  /** Soft minimum island size (at 512x512 reference): islands below this merge unless high-contrast. */
  minAreaRef: number
  /** Minimum island floor on smaller photos (capped by 4% of opaque pixels). */
  minHardFloor: number
  minAreaFloor: number
  /** Perceptual RGB contrast (0..255) above which islands >= minHard are preserved as crisp accents. */
  preserveContrast: number
  /** Maximum perceptual RGB contrast for pruning 1px protruding edge spikes. */
  spikeContrast: number
}

const REF_AREA = 512 * 512

const DETAIL_CONFIGS: Record<ThreadMapDetail, DetailConfig> = {
  crisp: {
    bilateralPasses: 1,
    sigmaColor: 16,
    centerBias: 1.75,
    minHardRef: 2,
    minAreaRef: 8,
    minHardFloor: 2,
    minAreaFloor: 4,
    preserveContrast: 30,
    spikeContrast: 28,
  },
  painterly: {
    bilateralPasses: 2,
    sigmaColor: 38,
    centerBias: 1.0,
    minHardRef: 12,
    minAreaRef: 64,
    minHardFloor: 5,
    minAreaFloor: 10,
    preserveContrast: 78,
    spikeContrast: 85,
  },
  broad: {
    bilateralPasses: 3,
    sigmaColor: 58,
    centerBias: 0.78,
    minHardRef: 32,
    minAreaRef: 220,
    minHardFloor: 10,
    minAreaFloor: 24,
    preserveContrast: 115,
    spikeContrast: 130,
  },
}

/** Fast perceptual RGB squared distance (0..65025), sensitive to both luminance and hue edges. */
function colorDistSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return (2 * dr * dr + 4 * dg * dg + 3 * db * db) / 9
}

function buildRangeLut(sigmaColor: number): Float32Array {
  const lut = new Float32Array(256)
  // Using unscaled weighted RGB squared distance: 2*dr^2 + 4*dg^2 + 3*db^2 (9x scaled).
  // Max value is 9 * 255^2 = 585,225; index = min(255, distSq9 >> 11) (step = 2048).
  const denom = 2 * sigmaColor * sigmaColor * 9
  for (let i = 0; i < 256; i++) {
    const distSq9 = i * 2048 + 1024
    lut[i] = Math.exp(-distSq9 / denom)
  }
  lut[0] = 1
  return lut
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

/**
 * Counts 4-connected opaque regions (islands) in a slot map.
 * Useful for tests and fragmentation diagnostics.
 */
export function countSlotRegions(
  slot: Uint8Array,
  width: number,
  height: number,
  smallThreshold = 48,
): { total: number; small: number; tiny: number } {
  const n = width * height
  const visited = new Uint8Array(n)
  const queue = new Int32Array(n)
  let total = 0
  let small = 0
  let tiny = 0

  for (let i = 0; i < n; i++) {
    const target = slot[i]
    if (visited[i] || target === NO_THREAD) continue
    let head = 0
    let tail = 0
    queue[tail++] = i
    visited[i] = 1

    while (head < tail) {
      const p = queue[head++]
      const x = p % width
      const y = (p - x) / width
      if (x > 0) {
        const q = p - 1
        if (!visited[q] && slot[q] === target) { visited[q] = 1; queue[tail++] = q }
      }
      if (x + 1 < width) {
        const q = p + 1
        if (!visited[q] && slot[q] === target) { visited[q] = 1; queue[tail++] = q }
      }
      if (y > 0) {
        const q = p - width
        if (!visited[q] && slot[q] === target) { visited[q] = 1; queue[tail++] = q }
      }
      if (y + 1 < height) {
        const q = p + width
        if (!visited[q] && slot[q] === target) { visited[q] = 1; queue[tail++] = q }
      }
    }

    total++
    if (tail <= 4) tiny++
    if (tail < smallThreshold) small++
  }

  return { total, small, tiny }
}

/**
 * Runs edge-preserving joint-bilateral majority filtering, connected-component small-island
 * merging, and 1px edge-spike pruning on `initialSlot`.
 *
 * Returns a new Uint8Array without mutating `initialSlot`. Transparent pixels (`NO_THREAD`)
 * are preserved unchanged.
 */
export function smoothSlotMap(
  initialSlot: Uint8Array,
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  threads: readonly DMCThread[],
  detail: ThreadMapDetail,
): Uint8Array {
  const n = width * height
  const slotCount = threads.length
  if (n === 0 || slotCount <= 1) return new Uint8Array(initialSlot)

  let opaqueCount = 0
  for (let i = 0; i < n; i++) {
    if (initialSlot[i] !== NO_THREAD) opaqueCount++
  }
  if (opaqueCount < 16) return new Uint8Array(initialSlot)

  const cfg = DETAIL_CONFIGS[detail]
  const rangeLut = buildRangeLut(cfg.sigmaColor)

  // Stage 1: Joint-bilateral 3x3 majority filter (synchronous double-buffered passes).
  let src: Uint8Array<ArrayBufferLike> = new Uint8Array(initialSlot)
  let dst: Uint8Array<ArrayBufferLike> = new Uint8Array(n)
  const votes = new Float32Array(slotCount)
  const touched = new Uint8Array(slotCount)

  // Spatial weights for 3x3: center = centerBias, cardinal = 0.75, diagonal = 0.5
  const centerW = cfg.centerBias
  const cardinalW = 0.75
  const diagW = 0.5

  for (let pass = 0; pass < cfg.bilateralPasses; pass++) {
    for (let y = 0; y < height; y++) {
      const row = y * width
      const yMin = y > 0 ? y - 1 : 0
      const yMax = y + 1 < height ? y + 1 : height - 1
      const interiorY = y > 0 && y + 1 < height

      for (let x = 0; x < width; x++) {
        const p = row + x
        const s0 = src[p]
        if (s0 === NO_THREAD || s0 >= slotCount) {
          dst[p] = s0
          continue
        }

        // Fast path: interior pixel whose entire 3x3 neighborhood already shares `s0` cannot change.
        if (
          interiorY
          && x > 0
          && x + 1 < width
          && src[p - 1] === s0
          && src[p + 1] === s0
          && src[p - width] === s0
          && src[p + width] === s0
          && src[p - width - 1] === s0
          && src[p - width + 1] === s0
          && src[p + width - 1] === s0
          && src[p + width + 1] === s0
        ) {
          dst[p] = s0
          continue
        }

        const o0 = p * 4
        const r0 = rgba[o0]
        const g0 = rgba[o0 + 1]
        const b0 = rgba[o0 + 2]

        const xMin = x > 0 ? x - 1 : 0
        const xMax = x + 1 < width ? x + 1 : width - 1

        let touchedLen = 0
        for (let ny = yMin; ny <= yMax; ny++) {
          const nRow = ny * width
          const dy = ny - y
          for (let nx = xMin; nx <= xMax; nx++) {
            const q = nRow + nx
            const sq = src[q]
            if (sq === NO_THREAD || sq >= slotCount) continue

            let w: number
            if (q === p) {
              w = centerW
            } else {
              const oq = q * 4
              const dr = r0 - rgba[oq]
              const dg = g0 - rgba[oq + 1]
              const db = b0 - rgba[oq + 2]
              const dSq9 = 2 * dr * dr + 4 * dg * dg + 3 * db * db
              const lutIdx = dSq9 >= 522240 ? 255 : (dSq9 >> 11)
              const spatial = (dy === 0 || nx === x) ? cardinalW : diagW
              w = spatial * rangeLut[lutIdx]
            }

            if (votes[sq] === 0) {
              touched[touchedLen++] = sq
            }
            votes[sq] += w
          }
        }

        let bestSlot = s0
        let bestVote = votes[s0]
        for (let t = 0; t < touchedLen; t++) {
          const cand = touched[t]
          const v = votes[cand]
          if (v > bestVote + 1e-6 || (Math.abs(v - bestVote) <= 1e-6 && cand !== s0 && bestSlot !== s0 && cand < bestSlot)) {
            bestVote = v
            bestSlot = cand
          }
          votes[cand] = 0
        }
        dst[p] = bestSlot
      }
    }

    const tmp = src
    src = dst
    dst = tmp
  }

  // Stage 2: Light 1px protruding edge-spike cleanup for crisp, hand-drawn transfer outlines.
  dst.set(src)
  const spikeContrastSq = cfg.spikeContrast * cfg.spikeContrast
  for (let y = 1; y < height - 1; y++) {
    const row = y * width
    for (let x = 1; x < width - 1; x++) {
      const p = row + x
      const s0 = src[p]
      if (s0 === NO_THREAD || s0 >= slotCount) continue

      const sL = src[p - 1]
      const sR = src[p + 1]
      const sU = src[p - width]
      const sD = src[p + width]

      let same = 0
      if (sL === s0) same++
      if (sR === s0) same++
      if (sU === s0) same++
      if (sD === s0) same++
      if (same >= 2) continue

      const cand = sL === sR ? sL : sU === sD ? sU : sL === sU ? sL : sR === sD ? sR : NO_THREAD
      if (cand === NO_THREAD || cand === s0 || cand >= slotCount) continue

      let candCount = 0
      let nr = 0
      let ng = 0
      let nb = 0
      if (sL === cand) { candCount++; const o = (p - 1) * 4; nr += rgba[o]; ng += rgba[o + 1]; nb += rgba[o + 2] }
      if (sR === cand) { candCount++; const o = (p + 1) * 4; nr += rgba[o]; ng += rgba[o + 1]; nb += rgba[o + 2] }
      if (sU === cand) { candCount++; const o = (p - width) * 4; nr += rgba[o]; ng += rgba[o + 1]; nb += rgba[o + 2] }
      if (sD === cand) { candCount++; const o = (p + width) * 4; nr += rgba[o]; ng += rgba[o + 1]; nb += rgba[o + 2] }

      if (candCount >= 3) {
        if (same === 0) {
          dst[p] = cand
        } else {
          const op = p * 4
          const dSq = colorDistSq(rgba[op], rgba[op + 1], rgba[op + 2], nr / candCount, ng / candCount, nb / candCount)
          if (dSq < spikeContrastSq) {
            dst[p] = cand
          }
        }
      }
    }
  }
  src = dst

  // Stage 3: Connected-component small-island absorption (up to 3 passes to resolve nested specks).
  const maxAllowed = Math.floor(opaqueCount * 0.04)
  const minArea = Math.min(
    maxAllowed,
    clampInt((opaqueCount * cfg.minAreaRef) / REF_AREA, cfg.minAreaFloor, Math.round(cfg.minAreaRef * 1.15)),
  )
  const minHard = Math.min(
    minArea,
    clampInt((opaqueCount * cfg.minHardRef) / REF_AREA, cfg.minHardFloor, Math.round(cfg.minHardRef * 1.15)),
  )

  if (minArea >= 2) {
    // Precompute pairwise squared OKLab distance between threads for deterministic tie-breaking.
    const threadDistSq = new Float32Array(slotCount * slotCount)
    for (let i = 0; i < slotCount; i++) {
      const a = threads[i].oklab
      for (let j = 0; j < slotCount; j++) {
        const b = threads[j].oklab
        const dL = a.L - b.L
        const da = a.a - b.a
        const db = a.b - b.b
        threadDistSq[i * slotCount + j] = dL * dL + da * da + db * db
      }
    }

    const visited = new Uint8Array(n)
    const queue = new Int32Array(n)
    const borderCounts = new Int32Array(slotCount)
    const borderR = new Float64Array(slotCount)
    const borderG = new Float64Array(slotCount)
    const borderB = new Float64Array(slotCount)
    const touchedNeighbors = new Uint8Array(slotCount)
    const preserveContrastSq = cfg.preserveContrast * cfg.preserveContrast

    for (let pass = 0; pass < 3; pass++) {
      visited.fill(0)
      let mergedAny = false

      for (let start = 0; start < n; start++) {
        const target = src[start]
        if (visited[start] || target === NO_THREAD || target >= slotCount) continue

        let head = 0
        let tail = 0
        queue[tail++] = start
        visited[start] = 1

        let compR = 0
        let compG = 0
        let compB = 0
        let neighborCount = 0

        const recordBorder = (q: number) => {
          const ns = src[q]
          if (ns === NO_THREAD || ns >= slotCount || ns === target) return
          if (borderCounts[ns] === 0) {
            touchedNeighbors[neighborCount++] = ns
          }
          borderCounts[ns]++
          const oq = q * 4
          borderR[ns] += rgba[oq]
          borderG[ns] += rgba[oq + 1]
          borderB[ns] += rgba[oq + 2]
        }

        while (head < tail) {
          const p = queue[head++]
          const op = p * 4
          compR += rgba[op]
          compG += rgba[op + 1]
          compB += rgba[op + 2]

          const x = p % width
          const y = (p - x) / width

          if (x > 0) {
            const q = p - 1
            if (src[q] === target) {
              if (!visited[q]) { visited[q] = 1; queue[tail++] = q }
            } else {
              recordBorder(q)
            }
          }
          if (x + 1 < width) {
            const q = p + 1
            if (src[q] === target) {
              if (!visited[q]) { visited[q] = 1; queue[tail++] = q }
            } else {
              recordBorder(q)
            }
          }
          if (y > 0) {
            const q = p - width
            if (src[q] === target) {
              if (!visited[q]) { visited[q] = 1; queue[tail++] = q }
            } else {
              recordBorder(q)
            }
          }
          if (y + 1 < height) {
            const q = p + width
            if (src[q] === target) {
              if (!visited[q]) { visited[q] = 1; queue[tail++] = q }
            } else {
              recordBorder(q)
            }
          }
        }

        const size = tail
        if (size < minArea && neighborCount > 0) {
          let bestNeighbor = -1
          let bestCount = -1
          let bestThreadDist = Infinity

          for (let i = 0; i < neighborCount; i++) {
            const ns = touchedNeighbors[i]
            const c = borderCounts[ns]
            const d = threadDistSq[target * slotCount + ns]
            if (
              c > bestCount
              || (c === bestCount && d < bestThreadDist - 1e-9)
              || (c === bestCount && Math.abs(d - bestThreadDist) <= 1e-9 && ns < bestNeighbor)
            ) {
              bestCount = c
              bestThreadDist = d
              bestNeighbor = ns
            }
          }

          let shouldMerge = bestNeighbor >= 0
          if (shouldMerge && size >= minHard) {
            const invSize = 1 / size
            const invBorder = 1 / bestCount
            const contrastSq = colorDistSq(
              compR * invSize,
              compG * invSize,
              compB * invSize,
              borderR[bestNeighbor] * invBorder,
              borderG[bestNeighbor] * invBorder,
              borderB[bestNeighbor] * invBorder,
            )
            if (contrastSq >= preserveContrastSq) {
              shouldMerge = false
            }
          }

          if (shouldMerge) {
            for (let k = 0; k < size; k++) {
              src[queue[k]] = bestNeighbor
            }
            mergedAny = true
          }
        }

        // Reset border accumulators for next component.
        for (let i = 0; i < neighborCount; i++) {
          const ns = touchedNeighbors[i]
          borderCounts[ns] = 0
          borderR[ns] = 0
          borderG[ns] = 0
          borderB[ns] = 0
        }
      }

      if (!mergedAny) break
    }
  }

  return src
}
