import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import BasisNote from './BasisNote'

const html = (topic: 'name' | 'relationships' | 'paint' | 'thread') => renderToStaticMarkup(createElement(BasisNote, { topic }))

describe('BasisNote markup', () => {
  it('is a closed disclosure with a basis chip, the method, the limits and the unverified line', () => {
    const out = html('thread')
    expect(out).toMatch(/<details[^>]*data-basis="catalog"/)
    expect(out).not.toMatch(/<details[^>]* open/)
    expect(out).toContain('Catalog match')
    expect(out).toContain('How this was found')
    expect(out).toContain('What could make the real thing differ')
    expect(out).toContain('Dye lot')
    expect(out).toContain('No physical check has been done.')
  })

  it('marks paint as calculated', () => {
    expect(html('paint')).toMatch(/data-basis="calculated"/)
  })
})
