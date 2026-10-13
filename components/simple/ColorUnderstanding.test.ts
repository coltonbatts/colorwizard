import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ColorUnderstanding from './ColorUnderstanding'

const html = (hex: string) => renderToStaticMarkup(createElement(ColorUnderstanding, { hex, onOpenColor: () => undefined }))

describe('ColorUnderstanding markup', () => {
  it('says what the color is, in words, before any medium', () => {
    expect(html('#C45C3E')).toContain('A warm, mid-value, moderately strong red-orange.')
  })

  it('shows relationships as labeled, openable swatches and says what they are not', () => {
    const out = html('#4F7A3A')
    for (const label of ['Lighter', 'Darker', 'Softer', 'Stronger', 'Leans warmer', 'Leans cooler', 'Opposite']) expect(out).toContain(label)
    expect(out).toContain('not paint or thread matches')
    expect((out.match(/<button /g) ?? []).length).toBeGreaterThanOrEqual(8)
  })

  it('keeps technical values behind a disclosure', () => {
    expect(html('#C45C3E')).toMatch(/<details[^>]*>\s*<summary>Technical values<\/summary>/)
  })

  it('offers only lightness steps for a gray', () => {
    const out = html('#808080')
    expect(out).toContain('Lighter')
    expect(out).not.toContain('Opposite')
    expect(out).not.toContain('Leans warmer')
  })

  it('renders nothing for a value that is not a color', () => {
    expect(html('nope')).toBe('')
  })
})
