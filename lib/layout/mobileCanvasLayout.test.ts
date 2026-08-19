import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('mobile canvas-first layout contract', () => {
  const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')

  it.each([
    [390, 844, 666],
    [430, 932, 754],
  ])('reserves a 58px header and 120px collapsed sheet at %ix%i', (_width, height, expected) => {
    expect(height - 58 - 120).toBe(expected)
  })

  it('keeps the result layer out of flex flow and reserves its collapsed footprint', () => {
    expect(css).toMatch(/\.mobile-result-layer\s*\{[^}]*position:\s*absolute;/s)
    expect(css).toMatch(/\.mobile-preview-area--sample-loaded\s+\.mobile-canvas-frame\s*\{[^}]*padding-bottom:\s*120px;/s)
    expect(css).toMatch(/\.canvas-viewport--sample\s*\{[^}]*min-height:\s*0;/s)
  })
})
