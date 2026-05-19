import { describe, expect, it } from 'vitest'
import {
  analyzeSampleImageValue,
  buildImageValueContext,
  computeImageOklabLRange,
  formatImageValueBand,
  normalizeOklabLInImage,
  oklabLToValueBand,
} from './imageValue'

describe('imageValue', () => {
  it('computes clipped OKLab L range from sorted values', () => {
    const sorted = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])
    const range = computeImageOklabLRange(sorted, 0.1)
    expect(range.min).toBeCloseTo(0.2, 4)
    expect(range.max).toBeCloseTo(0.9, 4)
  })

  it('normalizes sample L into 0–100 within image range', () => {
    const range = { min: 0.2, max: 0.8 }
    expect(normalizeOklabLInImage(0.2, range)).toBe(0)
    expect(normalizeOklabLInImage(0.5, range)).toBe(50)
    expect(normalizeOklabLInImage(0.8, range)).toBe(100)
  })

  it('maps normalized position to artist-facing bands', () => {
    expect(oklabLToValueBand(85)).toBe('highlight')
    expect(oklabLToValueBand(65)).toBe('light')
    expect(oklabLToValueBand(50)).toBe('mid')
    expect(oklabLToValueBand(25)).toBe('dark')
    expect(oklabLToValueBand(10)).toBe('deepest-dark')
    expect(formatImageValueBand('mid')).toBe('Midtone')
  })

  it('analyzes sample with image context', () => {
    const ctx = buildImageValueContext(new Float32Array([0.1, 0.5, 0.9]), 0)
    expect(ctx).not.toBeNull()

    const sample = analyzeSampleImageValue({ r: 0, g: 0, b: 0 }, ctx)
    expect(sample.band).toBe('deepest-dark')
    expect(sample.normalizedPosition).toBe(0)
  })
})
