import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadCorpus } from '@/lib/paint/plan/fixtures/corpus'
import type { DMCThread } from '../types'
import {
  buildThreadMapColorSvg,
  buildThreadMapOutlineSvg,
  extractBinaryMaskGeometry,
  extractThreadMapGeometry,
  interiorOutlineToSvgPath,
  slotLoopsToSvgPath,
  traceArc,
  type CurveSink,
  type ThreadMapVectorGeometry,
  type VectorArc,
} from './contours'
import { buildThreadMap } from './engine'
import { NO_THREAD } from './types'

const ALL_THREADS: DMCThread[] = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/dmc-floss.json'), 'utf8'),
)
const CORPUS = loadCorpus('synthetic')

function arcEndpoints(arc: VectorArc, forward: boolean): { sx: number; sy: number; ex: number; ey: number } {
  const n = arc.points.length / 2
  const firstX = arc.points[0]
  const firstY = arc.points[1]
  const lastX = arc.points[(n - 1) * 2]
  const lastY = arc.points[(n - 1) * 2 + 1]
  return forward
    ? { sx: firstX, sy: firstY, ex: lastX, ey: lastY }
    : { sx: lastX, sy: lastY, ex: firstX, ey: firstY }
}

/** Verifies topological watertightness: every multi-arc loop closes vertex-to-vertex with zero gaps. */
function assertWatertightLoops(geom: ThreadMapVectorGeometry) {
  for (let s = 0; s < geom.slotCount; s++) {
    for (const loop of geom.slotLoops[s]) {
      expect(loop.arcs.length).toBeGreaterThan(0)
      if (loop.arcs.length === 1 && geom.arcs[loop.arcs[0].arcIndex].isClosed) {
        const arc = geom.arcs[loop.arcs[0].arcIndex]
        expect(arc.points.length / 2).toBeGreaterThanOrEqual(3)
        continue
      }
      for (let i = 0; i < loop.arcs.length; i++) {
        const aRef = loop.arcs[i]
        const bRef = loop.arcs[(i + 1) % loop.arcs.length]
        const a = arcEndpoints(geom.arcs[aRef.arcIndex], aRef.forward)
        const b = arcEndpoints(geom.arcs[bRef.arcIndex], bRef.forward)
        expect(a.ex).toBeCloseTo(b.sx, 5)
        expect(a.ey).toBeCloseTo(b.sy, 5)
      }
    }
  }
  // All coordinates stay strictly inside [0, width] × [0, height].
  for (const arc of geom.arcs) {
    for (let i = 0; i < arc.points.length; i += 2) {
      expect(arc.points[i]).toBeGreaterThanOrEqual(0)
      expect(arc.points[i]).toBeLessThanOrEqual(geom.width)
      expect(arc.points[i + 1]).toBeGreaterThanOrEqual(0)
      expect(arc.points[i + 1]).toBeLessThanOrEqual(geom.height)
    }
  }
}

interface RecordedCurve {
  op: 'M' | 'L' | 'Q' | 'Z'
  coords: number[]
}

function recordArc(arc: VectorArc, forward: boolean): RecordedCurve[] {
  const ops: RecordedCurve[] = []
  const sink: CurveSink = {
    moveTo(x, y) { ops.push({ op: 'M', coords: [x, y] }) },
    lineTo(x, y) { ops.push({ op: 'L', coords: [x, y] }) },
    quadraticCurveTo(cpx, cpy, x, y) { ops.push({ op: 'Q', coords: [cpx, cpy, x, y] }) },
    closePath() { ops.push({ op: 'Z', coords: [] }) },
  }
  traceArc(sink, arc, forward, true)
  return ops
}

describe('extractThreadMapGeometry — watertight topological arcs', () => {
  it('handles 2-region vertical split with single interior arc and dead-straight frame edges', () => {
    const w = 10
    const h = 8
    const slot = new Uint8Array(w * h).fill(1)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < 4; x++) slot[y * w + x] = 0
    }

    const geom = extractThreadMapGeometry(slot, w, h, 2)
    assertWatertightLoops(geom)

    // Exactly one interior arc along x = 4 separating slot 0 and slot 1.
    const interiorArcs = geom.arcs.filter((a) => !a.onFrame)
    expect(interiorArcs.length).toBe(1)
    expect(interiorArcs[0].isClosed).toBe(false)
    for (let i = 0; i < interiorArcs[0].points.length; i += 2) {
      expect(interiorArcs[0].points[i]).toBeCloseTo(4, 5)
    }

    // Both slots get 1 closed loop.
    expect(geom.slotLoops[0].length).toBe(1)
    expect(geom.slotLoops[1].length).toBe(1)
    expect(geom.hasTransparency).toBe(false)
  })

  it('resolves 4-way quadrant junctions and checkerboard saddles cleanly without self-crossing loops', () => {
    // 4x4 checkerboard of 2x2 blocks: saddle at (2, 2).
    const w = 4
    const h = 4
    const slot = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        slot[y * w + x] = ((x >= 2) !== (y >= 2)) ? 1 : 0
      }
    }

    const geom = extractThreadMapGeometry(slot, w, h, 2)
    assertWatertightLoops(geom)

    // Each slot forms 2 separate watertight loops kissing at the saddle (2, 2).
    expect(geom.slotLoops[0].length).toBe(2)
    expect(geom.slotLoops[1].length).toBe(2)

    // 4 interior arcs meet at (2,2); each is present once.
    const interiorArcs = geom.arcs.filter((a) => !a.onFrame)
    expect(interiorArcs.length).toBe(4)
  })

  it('extracts nested holes and islands inside holes as closed loops', () => {
    // 16x16 slot 0, containing an 8x8 hole of slot 1, containing a 2x2 island of slot 2.
    const w = 16
    const h = 16
    const slot = new Uint8Array(w * h).fill(0)
    for (let y = 4; y < 12; y++) {
      for (let x = 4; x < 12; x++) slot[y * w + x] = 1
    }
    for (let y = 7; y < 9; y++) {
      for (let x = 7; x < 9; x++) slot[y * w + x] = 2
    }

    const geom = extractThreadMapGeometry(slot, w, h, 3)
    assertWatertightLoops(geom)

    // Slot 0 has 2 loops (outer frame + inner hole), slot 1 has 2 loops (outer + inner hole), slot 2 has 1 loop.
    expect(geom.slotLoops[0].length).toBe(2)
    expect(geom.slotLoops[1].length).toBe(2)
    expect(geom.slotLoops[2].length).toBe(1)

    // Inner boundaries are pure closed loops (no junctions).
    const closedArcs = geom.arcs.filter((a) => a.isClosed)
    expect(closedArcs.length).toBe(2)
  })

  it('smooths a 45-degree pixel staircase into a near-collinear diagonal while keeping reverse symmetry', () => {
    const w = 24
    const h = 24
    const slot = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        slot[y * w + x] = x >= y ? 1 : 0
      }
    }

    const geom = extractThreadMapGeometry(slot, w, h, 2)
    assertWatertightLoops(geom)

    const diag = geom.arcs.find((a) => !a.onFrame)!
    expect(diag).toBeDefined()

    // Check interior smoothed points lie tightly along the true boundary diagonal y = x + 0.5
    // (raw pixel staircase alternated between y - x = 0 and y - x = 1, i.e. +/- 0.354 px off centerline).
    const n = diag.points.length / 2
    expect(n).toBeGreaterThanOrEqual(2)
    let maxDev = 0
    for (let i = 1; i < n - 1; i++) {
      const x = diag.points[i * 2]
      const y = diag.points[i * 2 + 1]
      if (x < 2 || x > w - 2) continue
      const dev = Math.abs(y - (x + 0.5)) / Math.SQRT2
      if (dev > maxDev) maxDev = dev
    }
    expect(maxDev).toBeLessThan(0.08)

    // Forward and reversed quadratic B-spline emission trace the exact same control/end points in reverse.
    const fwd = recordArc(diag, true)
    const rev = recordArc(diag, false)
    expect(fwd.length).toBe(rev.length)
    const qFwd = fwd.filter((o) => o.op === 'Q')
    const qRev = rev.filter((o) => o.op === 'Q')
    expect(qFwd.length).toBe(qRev.length)
    for (let i = 0; i < qFwd.length; i++) {
      const a = qFwd[i].coords
      const b = qRev[qRev.length - 1 - i].coords
      // Same quadratic control point (cpx, cpy).
      expect(a[0]).toBeCloseTo(b[0], 5)
      expect(a[1]).toBeCloseTo(b[1], 5)
    }
  })

  it('tracks transparent cutouts (NO_THREAD) cleanly as interior silhouettes', () => {
    const w = 12
    const h = 12
    const slot = new Uint8Array(w * h).fill(NO_THREAD)
    for (let y = 3; y < 9; y++) {
      for (let x = 3; x < 9; x++) slot[y * w + x] = 0
    }

    const geom = extractThreadMapGeometry(slot, w, h, 1)
    assertWatertightLoops(geom)
    expect(geom.hasTransparency).toBe(true)
    expect(geom.slotLoops[0].length).toBe(1)

    // Cutout silhouette is NOT onFrame, so it appears in the transfer outline SVG path.
    const outlinePath = interiorOutlineToSvgPath(geom)
    expect(outlinePath.length).toBeGreaterThan(0)
  })

  it('extracts clean vector paths for binary masks (visiblyOff hatching)', () => {
    const w = 10
    const h = 10
    const mask = new Uint8Array(w * h)
    for (let y = 2; y < 6; y++) {
      for (let x = 2; x < 7; x++) mask[y * w + x] = 1
    }
    const geom = extractBinaryMaskGeometry(mask, w, h)
    assertWatertightLoops(geom)
    expect(geom.slotLoops[0].length).toBe(1)
    expect(slotLoopsToSvgPath(geom.slotLoops[0], geom.arcs)).toContain('M')
  })

  it('produces deterministic, watertight geometry and valid vector SVGs on real corpus scenes', () => {
    for (const fixtureName of ['portrait-light', 'landscape', 'sunset']) {
      const image = CORPUS.find((img) => img.name === fixtureName)!
      const map = buildThreadMap(image.data, image.width, image.height, ALL_THREADS, {
        mode: 'full-color',
        budget: 10,
        detail: 'painterly',
      })

      const geomA = extractThreadMapGeometry(map.slot, map.width, map.height, map.slots.length)
      const geomB = extractThreadMapGeometry(map.slot, map.width, map.height, map.slots.length)
      assertWatertightLoops(geomA)

      expect(geomA.arcs.length).toBe(geomB.arcs.length)
      expect(geomA.arcs.length).toBeGreaterThan(map.slots.length)

      const outlineSvg = buildThreadMapOutlineSvg(map, false, geomA)
      const mirroredSvg = buildThreadMapOutlineSvg(map, true, geomA)
      const colorSvg = buildThreadMapColorSvg(map, geomA)

      expect(outlineSvg).toContain('<svg ')
      expect(outlineSvg).toContain('stroke="#1b1a18"')
      expect(mirroredSvg).toContain(`translate(${map.width} 0) scale(-1 1)`)
      expect(colorSvg).toContain('<svg ')
      expect(colorSvg).toContain('fill-rule="evenodd"')
      // Determinism check
      expect(buildThreadMapOutlineSvg(map, false, geomB)).toBe(outlineSvg)
    }
  })
})
