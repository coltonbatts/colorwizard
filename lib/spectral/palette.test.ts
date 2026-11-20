import { describe, expect, it } from 'vitest'
import { CORE_SIX_PIGMENT_IDS, PALETTE_MAP } from './palette'

describe('CORE_SIX_PIGMENT_IDS', () => {
  it('names six distinct pigments that are all in the palette', () => {
    expect(new Set(CORE_SIX_PIGMENT_IDS).size).toBe(6)
    for (const id of CORE_SIX_PIGMENT_IDS) expect(PALETTE_MAP.has(id), id).toBe(true)
  })
})
