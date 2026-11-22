import { describe, expect, it } from 'vitest'
import {
  canvasPosition, centeredCrop, columnLabel, formatInches, gridSegments, loadCanvasDraft,
  newCanvasDraft, referencePoint, storeCanvasDraft, transferMeasurements, validFace,
} from './canvasSetup'

const source = { width: 1968, height: 2464 }
const face = { width: 24, height: 30 }

describe('oil canvas transfer', () => {
  it('crops exactly two rows off each edge of the portrait reference', () => {
    expect(centeredCrop(source, face)).toEqual({ x: 0, y: 2, width: 1968, height: 2460 })
    expect(centeredCrop({ width: 100, height: 50 }, { width: 10, height: 10 }))
      .toEqual({ x: 25, y: 0, width: 50, height: 50 })
  })

  it('round trips the crop and physical position at landmarks and edge points', () => {
    const crop = centeredCrop(source, face)
    expect(canvasPosition(referencePoint({ x: 0, y: 0 }, source, crop), source, crop, face)).toEqual({ x: 0, y: 0 })
    expect(canvasPosition(referencePoint({ x: 1, y: 1 }, source, crop), source, crop, face)).toEqual(faceToPoint(face))
    const position = canvasPosition(referencePoint({ x: 0.5, y: 0.625 }, source, crop), source, crop, face)
    expect(position?.x).toBeCloseTo(12, 9)
    expect(position?.y).toBeCloseTo(18.75, 9)
    expect(canvasPosition({ x: 0.3, y: 0 }, source, crop, face)).toBeNull()
  })

  it('uses true 3-inch cells and truncates only the last cell when needed', () => {
    expect(gridSegments(face.width)).toHaveLength(8)
    expect(gridSegments(face.height)).toHaveLength(10)
    expect(gridSegments(25).at(-1)).toEqual({ start: 24, end: 25 })
    expect(columnLabel(7)).toBe('H')
    expect(columnLabel(26)).toBe('AA')
  })

  it('computes spans before rounding and flags landmarks outside a changed crop', () => {
    const crop = centeredCrop(source, face)
    const draft = {
      ...newCanvasDraft(face),
      landmarks: [
        { ...referencePoint({ x: 0.5, y: 0.5 }, source, crop), id: 'a', name: 'Head' },
        { ...referencePoint({ x: 0.625, y: 0.6333333333333 }, source, crop), id: 'b', name: 'Hand' },
        { x: 0.5, y: 0, id: 'c', name: 'Edge' },
      ],
      spans: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }],
    }
    const measured = transferMeasurements(draft, source, crop)
    expect(measured.spans[0].distance).toBeCloseTo(5, 9)
    expect(measured.spans[1].distance).toBeNull()
    expect(formatInches(12.137)).toBe('12 ⅛')
    expect(formatInches(0.49)).toBe('½')
    expect(formatInches(0)).toBe('0')
  })

  it('reattaches the single draft only to the same reference key', () => {
    let stored = ''
    const storage = { setItem: (_: string, json: string) => { stored = json }, getItem: () => stored }
    const draft = newCanvasDraft(face)
    draft.landmarks = [{ id: 'trial-1', name: 'Earth', x: 0.4, y: 0.8, trial: { hex: '#222222', measured: '3 parts Burnt Umber', correction: 'Sampled dry', acceptedPalette: 'my-palette' } }]
    draft.volumeUnit = '¼ mL'
    storeCanvasDraft(storage, 'reference-a', draft)
    expect(loadCanvasDraft(storage, 'reference-a')).toEqual(draft)
    expect(loadCanvasDraft(storage, 'reference-b')).toBeNull()
    storeCanvasDraft(storage, 'reference-b', newCanvasDraft(face))
    expect(loadCanvasDraft(storage, 'reference-a')).toBeNull()
  })

  it('rejects empty or invalid canvas dimensions', () => {
    expect(validFace(face)).toBe(true)
    expect(validFace({ ...face, width: 0 })).toBe(false)
    expect(validFace({ ...face, height: NaN })).toBe(false)
    expect(validFace({ ...face, height: Infinity })).toBe(false)
  })
})

function faceToPoint(size: { width: number; height: number }) {
  return { x: size.width, y: size.height }
}
