import { describe, expect, it } from 'vitest'
import { describeColor, hueName } from './profile'
import { parseColorInput } from './parseColorInput'

const profile = (hex: string) => {
  const result = describeColor(hex)
  if (!result) throw new Error(`no profile for ${hex}`)
  return result
}
const ids = (hex: string) => profile(hex).relationships.map((r) => r.id)

describe('parseColorInput', () => {
  it('accepts 3 and 6 digit hex, with or without #, any case', () => {
    expect(parseColorInput('#c45c3e')).toBe('#C45C3E')
    expect(parseColorInput(' C45C3E ')).toBe('#C45C3E')
    expect(parseColorInput('#fa0')).toBe('#FFAA00')
  })
  it('rejects everything else', () => {
    for (const text of ['', '#', '#12', '#12345', '#1234567', 'red', '#ggg000', 'rgb(1,2,3)']) {
      expect(parseColorInput(text)).toBeNull()
    }
  })
})

describe('describeColor', () => {
  it('describes the terracotta demo color in plain words', () => {
    const p = profile('#C45C3E')
    expect(p.description).toBe('A warm, mid-value, moderately strong red-orange.')
    expect(p.value).toBe(5.2)
  })

  it('returns null for something that is not a color', () => {
    expect(describeColor('nope')).toBeNull()
  })

  it('names hues across the wheel and wraps at red', () => {
    expect(hueName(0)).toBe('red')
    expect(hueName(359)).toBe('red')
    expect(hueName(264)).toBe('blue')
    expect(hueName(142)).toBe('green')
    expect(hueName(100)).toBe('yellow')
  })

  it('treats grays as neutral and offers only lightness steps', () => {
    const p = profile('#808080')
    expect(p.neutral).toBe(true)
    expect(p.description).toMatch(/neutral/)
    expect(ids('#808080')).toEqual(['lighter', 'darker'])
  })

  it('does not invent a lighter white or a darker black', () => {
    expect(ids('#FFFFFF')).toEqual(['darker'])
    expect(ids('#000000')).toEqual(['lighter'])
    expect(profile('#FFFFFF').description).toBe('A near-white neutral.')
    expect(profile('#000000').description).toBe('A near-black neutral.')
  })

  it('gives every chromatic color nearby and contrasting swatches that are valid, distinct and not itself', () => {
    for (const hex of ['#C45C3E', '#2E6F95', '#4F7A3A', '#E8C547', '#7B4B94', '#FF0000', '#00FF00', '#0000FF', '#FFFF00']) {
      const { relationships } = profile(hex)
      const hexes = relationships.map((r) => r.hex)
      expect(new Set(hexes).size).toBe(hexes.length)
      expect(hexes).not.toContain(hex)
      for (const r of relationships) expect(r.hex).toMatch(/^#[0-9A-F]{6}$/)
      expect(relationships.some((r) => r.group === 'contrasting')).toBe(true)
      expect(relationships.some((r) => r.group === 'nearby')).toBe(true)
    }
  })

  it('moves the way each label says', () => {
    const rel = (hex: string, id: string) => profile(hex).relationships.find((r) => r.id === id)!
    const base = '#4F7A3A'
    expect(rel(base, 'lighter').delta.l).toBeGreaterThan(0.03)
    expect(rel(base, 'darker').delta.l).toBeLessThan(-0.03)
    expect(rel(base, 'softer').delta.c).toBeLessThan(0)
    expect(rel(base, 'stronger').delta.c).toBeGreaterThan(0)
    expect(Math.abs(Math.abs(rel(base, 'opposite').delta.h) - 180)).toBeLessThan(15)
  })

  it('turns warmer toward orange and cooler toward blue', () => {
    const green = profile('#4F7A3A').relationships
    const warmerHue = describeColor(green.find((r) => r.id === 'warmer')!.hex)!.oklch.h
    const coolerHue = describeColor(green.find((r) => r.id === 'cooler')!.hex)!.oklch.h
    const baseHue = describeColor('#4F7A3A')!.oklch.h
    expect(Math.abs(warmerHue - 55)).toBeLessThan(Math.abs(baseHue - 55))
    expect(Math.abs(coolerHue - 250)).toBeLessThan(Math.abs(baseHue - 250))
  })

  it('drops a step the screen cannot show instead of repeating the color', () => {
    // Fully saturated red is already at the edge: "stronger" would be the same swatch.
    expect(ids('#FF0000')).not.toContain('stronger')
  })

  it('is deterministic and normalizes case', () => {
    expect(describeColor('#c45c3e')).toEqual(describeColor('#C45C3E'))
  })
})
