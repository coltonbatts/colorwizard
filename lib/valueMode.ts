import { getRelativeLuminance } from './valueScale'

export type ValueStepCount = 5 | 7 | 9 | 11

export interface ValueModeMetadata {
  /** Quantized luminance in [0..1] (perceptual relative luminance) */
  y: number
  /** 1..steps */
  step: number
  /** [min,max] luminance bounds in [0..1] for this step bin */
  range: [number, number]
  /** Not meaningful in value-mode (image-independent); reserved for UI compatibility */
  percentile: number
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

/**
 * Quantize a luminance value (0..1) into N perceptual value steps.
 *
 * We use evenly spaced *centers* from 0..1 (inclusive), then snap to the nearest center.
 * This is deterministic across devices/refreshes.
 */
export function quantizeValueLuminanceEven(y: number, steps: number): { yQuant: number; step: number; range: [number, number] } {
  if (steps < 2) {
    const yClamped = clamp01(y)
    return { yQuant: yClamped, step: 1, range: [0, 1] }
  }

  const yClamped = clamp01(y)
  const denom = steps - 1

  const idx = Math.round(yClamped * denom) // 0..denom
  const yQuant = idx / denom

  // Bin boundaries: halfway to neighboring centers
  const min = idx === 0 ? 0 : (idx - 0.5) / denom
  const max = idx === denom ? 1 : (idx + 0.5) / denom

  return { yQuant, step: idx + 1, range: [min, max] }
}

export function getValueModeMetadataFromRgb(
  rgb: { r: number; g: number; b: number },
  steps: ValueStepCount | number
): ValueModeMetadata {
  const yRaw = getRelativeLuminance(rgb.r, rgb.g, rgb.b)
  const { yQuant, step, range } = quantizeValueLuminanceEven(yRaw, steps)

  return {
    y: yQuant,
    step,
    range,
    percentile: 0,
  }
}

export function luminanceToGrayHex(y01: number): string {
  const v = Math.round(clamp01(y01) * 255)
  const hex = v.toString(16).padStart(2, '0')
  return `#${hex}${hex}${hex}`
}
