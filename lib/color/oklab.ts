/**
 * OKLab conversions (shared with DMC catalog metrics).
 */
import { converter } from 'culori'
import type { OklabCoords } from '@/lib/dmc/types'

const toOklab = converter('oklab')

export function rgbToOklab(
  rgb: { r: number; g: number; b: number },
): OklabCoords {
  const color = toOklab({
    mode: 'rgb',
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255,
  })
  return {
    L: color.l ?? 0,
    a: color.a ?? 0,
    b: color.b ?? 0,
  }
}

export function rgbToOklabL(rgb: { r: number; g: number; b: number }): number {
  return rgbToOklab(rgb).L
}
