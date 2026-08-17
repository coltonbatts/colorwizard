import { describe, it, expect } from 'vitest'
import {
  quantizeValueLuminanceEven,
  quantizeValuePerceptualEven,
  getValueModeMetadataFromRgb,
  luminanceToGrayHex,
  valueToGrayHex,
} from './valueMode'
import { getRelativeLuminance } from './valueScale'

describe('valueMode quantization', () => {
  it('is deterministic and clamps to bounds', () => {
    expect(quantizeValueLuminanceEven(-1, 9).step).toBe(1)
    expect(quantizeValueLuminanceEven(2, 9).step).toBe(9)
  })

  it('maps endpoints correctly', () => {
    const a = quantizeValueLuminanceEven(0, 5)
    const b = quantizeValueLuminanceEven(1, 5)

    expect(a.step).toBe(1)
    expect(a.yQuant).toBe(0)

    expect(b.step).toBe(5)
    expect(b.yQuant).toBe(1)
  })

  it('snaps to nearest center', () => {
    // steps=5 => centers: 0,0.25,0.5,0.75,1
    expect(quantizeValueLuminanceEven(0.12, 5).step).toBe(1)
    expect(quantizeValueLuminanceEven(0.13, 5).step).toBe(2)
    expect(quantizeValueLuminanceEven(0.62, 5).step).toBe(3)
    expect(quantizeValueLuminanceEven(0.63, 5).step).toBe(4)
  })
})

describe('value swatches', () => {
  it('renders the gray of a luminance, gamma-encoded', () => {
    // Regression: this used to write linear light straight into an sRGB byte, so middle
    // gray came out #373737 - about two value steps too dark.
    expect(luminanceToGrayHex(getRelativeLuminance(128, 128, 128))).toBe('#808080')
    expect(luminanceToGrayHex(0)).toBe('#000000')
    expect(luminanceToGrayHex(1)).toBe('#ffffff')
  })

  it('renders the gray of a perceptual value', () => {
    expect(valueToGrayHex(0.5)).toBe('#777777') // value 5 of 10
    expect(valueToGrayHex(0)).toBe('#000000')
    expect(valueToGrayHex(1)).toBe('#ffffff')
  })

  it('clamps out-of-range input', () => {
    expect(valueToGrayHex(-1)).toBe('#000000')
    expect(valueToGrayHex(2)).toBe('#ffffff')
  })
})

describe('perceptual value quantization', () => {
  it('puts middle gray near the middle of a 9-step scale', () => {
    const y = getRelativeLuminance(128, 128, 128)
    // Luminance-even binning called middle gray step 3 of 9; perceptual binning says 5.
    expect(quantizeValueLuminanceEven(y, 9).step).toBe(3)
    expect(quantizeValuePerceptualEven(y, 9).step).toBe(5)
  })

  it('keeps endpoints and step count intact', () => {
    expect(quantizeValuePerceptualEven(0, 7).step).toBe(1)
    expect(quantizeValuePerceptualEven(1, 7).step).toBe(7)
    expect(quantizeValuePerceptualEven(0, 7).yQuant).toBeCloseTo(0, 6)
    expect(quantizeValuePerceptualEven(1, 7).yQuant).toBeCloseTo(1, 6)
  })

  it('clamps out-of-range luminance', () => {
    expect(quantizeValuePerceptualEven(-1, 9).step).toBe(1)
    expect(quantizeValuePerceptualEven(2, 9).step).toBe(9)
  })

  it('returns a single bin when steps < 2', () => {
    const r = quantizeValuePerceptualEven(0.4, 1)
    expect(r.step).toBe(1)
    expect(r.range).toEqual([0, 1])
  })

  it('drives value-mode metadata from the perceptual scale', () => {
    const meta = getValueModeMetadataFromRgb({ r: 128, g: 128, b: 128 }, 9)
    expect(meta.step).toBe(5)
    // y stays in luminance space so existing consumers are unaffected.
    expect(meta.y).toBeGreaterThan(0)
    expect(meta.y).toBeLessThan(1)
  })
})
