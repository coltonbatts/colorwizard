import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { averageColorAt, DEMO_PICTURE, firstSamplePixel } from './demoPicture'

describe('demo picture', () => {
  it('ships the picture it points to', () => {
    expect(existsSync(path.join('public', DEMO_PICTURE.src))).toBe(true)
  })

  it('samples inside the picture', () => {
    expect(firstSamplePixel(1280, 879)).toEqual({ x: 102, y: 378 })
    const { x, y } = firstSamplePixel(1, 1)
    expect([x, y]).toEqual([0, 0])
  })

  it('averages the square around a pixel and clips at the edges', () => {
    // 3x2 picture: left column red, the rest blue
    const px = (r: number, g: number, b: number) => [r, g, b, 255]
    const data = [...px(255, 0, 0), ...px(0, 0, 255), ...px(0, 0, 255), ...px(255, 0, 0), ...px(0, 0, 255), ...px(0, 0, 255)]
    expect(averageColorAt(data, 3, 2, 0, 0, 0)).toEqual({ r: 255, g: 0, b: 0 })
    // corner, radius 1: 2x2 in bounds = 2 red + 2 blue
    expect(averageColorAt(data, 3, 2, 0, 0, 1)).toEqual({ r: 128, g: 0, b: 128 })
    // middle top, radius 1: all 6 pixels
    expect(averageColorAt(data, 3, 2, 1, 0, 1)).toEqual({ r: 85, g: 0, b: 170 })
  })
})
