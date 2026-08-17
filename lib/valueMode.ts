import {
  getRelativeLuminance,
  linearToSRGB,
  luminanceToValue01,
  value01ToGrayByte,
  value01ToLuminance,
} from './valueScale'

export type ValueStepCount = 5 | 7 | 9 | 11
export const DEFAULT_VALUE_STEP_COUNT: ValueStepCount = 7

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

/**
 * Quantize into N evenly spaced *value* steps, matching a painter's value scale.
 * Input and output stay in luminance so callers are unaffected; only the spacing changes.
 * Quantizing evenly in luminance instead puts everything below L*45 in the bottom step.
 */
export function quantizeValuePerceptualEven(
  y: number,
  steps: number
): { yQuant: number; step: number; range: [number, number] } {
  if (steps < 2) {
    return { yQuant: clamp01(y), step: 1, range: [0, 1] }
  }

  const denom = steps - 1
  const value = clamp01(luminanceToValue01(clamp01(y)))
  const idx = Math.round(value * denom)

  const minValue = idx === 0 ? 0 : (idx - 0.5) / denom
  const maxValue = idx === denom ? 1 : (idx + 0.5) / denom

  return {
    yQuant: value01ToLuminance(idx / denom),
    step: idx + 1,
    range: [value01ToLuminance(minValue), value01ToLuminance(maxValue)],
  }
}

export function getValueModeMetadataFromRgb(
  rgb: { r: number; g: number; b: number },
  steps: ValueStepCount | number
): ValueModeMetadata {
  const yRaw = getRelativeLuminance(rgb.r, rgb.g, rgb.b)
  const { yQuant, step, range } = quantizeValuePerceptualEven(yRaw, steps)

  return {
    y: yQuant,
    step,
    range,
    percentile: 0,
  }
}

/**
 * Gray swatch for a luminance. The luminance must be gamma-encoded on the way out - writing
 * linear light straight into an sRGB byte renders middle gray as #373737.
 */
export function luminanceToGrayHex(y01: number): string {
  const v = Math.round(linearToSRGB(clamp01(y01)) * 255)
  const hex = v.toString(16).padStart(2, '0')
  return `#${hex}${hex}${hex}`
}

/** Gray swatch for a perceptual value (0..1). */
export function valueToGrayHex(value01: number): string {
  const v = value01ToGrayByte(clamp01(value01))
  const hex = v.toString(16).padStart(2, '0')
  return `#${hex}${hex}${hex}`
}
