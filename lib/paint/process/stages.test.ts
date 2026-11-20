import { describe, expect, it } from 'vitest'
import { getPerceptualValue } from '@/lib/valueScale'
import { brownForValue } from './brown'
import { bandEdges, blur, buildStages, frameAt, GROUND_VALUE, STAGE_IDS, valueBands, valueNumber } from './stages'
import { STAGE_COPY } from './stageCopy'

/** A W×H picture: left third black, middle third mid gray, right third white. */
function thirds(width = 60, height = 20): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const v = x < width / 3 ? 0 : x < (2 * width) / 3 ? 119 : 255
    data.set([v, v, v, 255], (y * width + x) * 4)
  }
  return data
}

const rgbAt = (frame: Uint8ClampedArray, i: number) => [frame[i * 4], frame[i * 4 + 1], frame[i * 4 + 2]] as const

describe('brownForValue', () => {
  it('lands on the asked value and is warm (red ≥ green ≥ blue) in the middle', () => {
    for (const v of [0.1, 0.3, 0.5, 0.6, 0.8, 0.95]) {
      const [r, g, b] = brownForValue(v)
      expect(Math.abs(getPerceptualValue(r, g, b) - v)).toBeLessThan(0.01)
    }
    const [r, g, b] = brownForValue(0.5)
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })
})

describe('blur', () => {
  it('keeps a flat field flat and the mean of any field', () => {
    const flat = new Float32Array(100).fill(0.4)
    for (const v of blur(flat, 10, 10, 3)) expect(v).toBeCloseTo(0.4, 5)
    const step = new Float32Array(100).map((_, i) => (i % 10 < 5 ? 0 : 1))
    const out = blur(step, 10, 10, 2)
    expect(out[0]).toBeLessThan(out[9]) // still dark on the left, light on the right
    expect(out[4]).toBeGreaterThan(0) // the edge softened
  })
})

describe('valueBands', () => {
  it('finds the three values of a three-value picture, dark to light', () => {
    const values = new Float32Array(300).map((_, i) => [0.1, 0.5, 0.9][i % 3])
    const { centers, band } = valueBands(values, 3)
    expect(centers.map((c) => Math.round(c * 10) / 10)).toEqual([0.1, 0.5, 0.9])
    expect(band[0]).toBe(0)
    expect(band[2]).toBe(2)
  })

  it('gives a flat picture one band, never repeated values', () => {
    const { centers } = valueBands(new Float32Array(50).fill(0.42), 6)
    expect(centers.length).toBe(1)
  })
})

describe('bandEdges', () => {
  it('marks only the boundaries between bands', () => {
    const band = new Uint8Array(6 * 2).map((_, i) => (i % 6 < 3 ? 0 : 1))
    const edges = bandEdges(band, 6, 2, 1)
    expect(Array.from(edges)).toEqual([0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0])
  })
})

describe('buildStages', () => {
  const width = 60
  const height = 20
  const stages = buildStages(thirds(width, height), width, height)

  it('makes one frame per stage, each the picture’s size and opaque', () => {
    expect(stages.frames.length).toBe(STAGE_IDS.length)
    for (const frame of stages.frames) {
      expect(frame.length).toBe(width * height * 4)
      for (let i = 3; i < frame.length; i += 4) expect(frame[i]).toBe(255)
    }
  })

  it('tones the ground evenly at the ground value', () => {
    const ground = stages.frames[0]
    const [r, g, b] = rgbAt(ground, 0)
    expect(Math.abs(getPerceptualValue(r, g, b) - GROUND_VALUE)).toBeLessThan(0.01)
    for (let i = 0; i < width * height; i++) expect(rgbAt(ground, i)).toEqual([r, g, b])
  })

  it('draws the lay-in only on the boundaries, darker than the ground', () => {
    const ground = stages.frames[0]
    const layIn = stages.frames[1]
    let lines = 0
    for (let i = 0; i < width * height; i++) {
      if (rgbAt(layIn, i).join() === rgbAt(ground, i).join()) continue
      lines++
      expect(getPerceptualValue(...rgbAt(layIn, i))).toBeLessThan(GROUND_VALUE)
    }
    expect(lines).toBeGreaterThan(0)
    expect(lines).toBeLessThan((width * height) / 3) // lines, not fills
  })

  it('keeps the picture’s value order in the massing and the underpainting', () => {
    for (const frame of [stages.frames[2], stages.frames[3]]) {
      const left = getPerceptualValue(...rgbAt(frame, 10 * width + 2))
      const mid = getPerceptualValue(...rgbAt(frame, 10 * width + 30))
      const right = getPerceptualValue(...rgbAt(frame, 10 * width + 57))
      expect(left).toBeLessThan(mid)
      expect(mid).toBeLessThan(right)
    }
    expect(stages.massingValues.length).toBeLessThanOrEqual(3)
    expect([...stages.brunailleValues].sort((a, b) => a - b)).toEqual(stages.brunailleValues)
    expect(stages.brunailleShares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
  })

  it('is deterministic', () => {
    const again = buildStages(thirds(width, height), width, height)
    again.frames.forEach((frame, i) => expect(Array.from(frame)).toEqual(Array.from(stages.frames[i])))
  })
})

describe('frameAt', () => {
  const a = new Uint8ClampedArray([0, 0, 0, 255])
  const b = new Uint8ClampedArray([200, 100, 50, 255])
  it('returns the stages themselves at whole positions and blends between them', () => {
    expect(frameAt([a, b], 0)).toBe(a)
    expect(frameAt([a, b], 1)).toBe(b)
    expect(Array.from(frameAt([a, b], 0.5))).toEqual([100, 50, 25, 255])
    expect(frameAt([a, b], 7)).toBe(b) // clamped
  })
})

describe('copy', () => {
  it('has words for every stage, in order', () => {
    expect(STAGE_COPY.map((s) => s.id)).toEqual([...STAGE_IDS])
  })
  it('writes value numbers on the 0–10 scale', () => {
    expect(valueNumber(0.6)).toBe('6.0')
    expect(valueNumber(0.234)).toBe('2.3')
  })
})
