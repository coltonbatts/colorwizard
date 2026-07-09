import { describe, it, expect } from 'vitest'
import { quantizePixels, type RawPixel } from './quantization'
import type { DMCThread } from '../dmc/types'

const mockThreads: DMCThread[] = [
  {
    id: 'dmc:310',
    brand: 'dmc',
    number: '310',
    name: 'Black',
    rgb: { r: 0, g: 0, b: 0 },
    hex: '#000000',
    productLine: 'mouline-solid',
    familyId: 'grey',
    familyLabel: 'Greys',
    shadeStep: 'very-dark',
    shadeRank: 0,
    familySize: 1,
    oklab: { L: 0, a: 0, b: 0 },
    hueBucket: 'neutral',
    warmth: 'neutral',
  },
  {
    id: 'dmc:blanc',
    brand: 'dmc',
    number: 'Blanc',
    name: 'White',
    rgb: { r: 255, g: 255, b: 255 },
    hex: '#ffffff',
    productLine: 'mouline-solid',
    familyId: 'white',
    familyLabel: 'Whites',
    shadeStep: 'very-light',
    shadeRank: 0,
    familySize: 1,
    oklab: { L: 1, a: 0, b: 0 },
    hueBucket: 'neutral',
    warmth: 'neutral',
  },
  {
    id: 'dmc:666',
    brand: 'dmc',
    number: '666',
    name: 'Bright Red',
    rgb: { r: 255, g: 0, b: 0 },
    hex: '#ff0000',
    productLine: 'mouline-solid',
    familyId: 'red',
    familyLabel: 'Reds',
    shadeStep: 'medium',
    shadeRank: 0,
    familySize: 1,
    oklab: { L: 0.5, a: 0.5, b: 0 },
    hueBucket: 'red',
    warmth: 'warm',
  },
]

describe('quantizePixels', () => {
  it('should cluster colors and map them to nearest DMC thread', () => {
    // 3x3 grid:
    // Row 0: 3 Black pixels
    // Row 1: 3 Red pixels
    // Row 2: 2 Black pixels, 1 Transparent pixel
    const rawPixels: RawPixel[] = [
      { x: 0, y: 0, r: 5, g: 2, b: 1, isTransparent: false },
      { x: 1, y: 0, r: 0, g: 1, b: 0, isTransparent: false },
      { x: 2, y: 0, r: 2, g: 0, b: 3, isTransparent: false },
      
      { x: 0, y: 1, r: 250, g: 10, b: 5, isTransparent: false },
      { x: 1, y: 1, r: 255, g: 0, b: 0, isTransparent: false },
      { x: 2, y: 1, r: 245, g: 2, b: 10, isTransparent: false },
      
      { x: 0, y: 2, r: 1, g: 1, b: 1, isTransparent: false },
      { x: 1, y: 2, r: 0, g: 0, b: 0, isTransparent: false },
      { x: 2, y: 2, r: 0, g: 0, b: 0, isTransparent: true }, // transparent background
    ]

    const result = quantizePixels(rawPixels, 3, 3, 2, mockThreads)

    // Verify grid size
    expect(result.width).toBe(3)
    expect(result.height).toBe(3)

    // Verify legend length (2 clusters plus transparent is excluded from legend list count)
    expect(result.legend).toHaveLength(2)

    // First legend item should be the most common color (Black - 5 pixels)
    expect(result.legend[0].dmcCode).toBe('310')
    expect(result.legend[0].count).toBe(5)
    
    // Second legend item should be Bright Red (3 pixels)
    expect(result.legend[1].dmcCode).toBe('666')
    expect(result.legend[1].count).toBe(3)

    // Verify cell assignments
    expect(result.cells[0].dmcCode).toBe('310')
    expect(result.cells[0].isTransparent).toBe(false)
    expect(result.cells[3].dmcCode).toBe('666')
    expect(result.cells[3].isTransparent).toBe(false)
    
    // Verify transparent cell assignment
    expect(result.cells[8].isTransparent).toBe(true)
    expect(result.cells[8].dmcCode).toBe('')
    expect(result.cells[8].symbol).toBe(' ')
  })
})
