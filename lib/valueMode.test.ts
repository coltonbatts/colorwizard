import { describe, it, expect } from 'vitest'
import { quantizeValueLuminanceEven } from './valueMode'

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
