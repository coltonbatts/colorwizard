import { describe, expect, it } from 'vitest'
import { webcrypto } from 'node:crypto'
import { newId } from './newId'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('newId', () => {
  it('uses randomUUID when the context has it', () => {
    expect(newId({ getRandomValues: webcrypto.getRandomValues.bind(webcrypto), randomUUID: () => 'from-random-uuid' } as never)).toBe('from-random-uuid')
  })

  it('builds a v4 UUID without randomUUID (an insecure http:// page)', () => {
    const insecure = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) } as Pick<Crypto, 'getRandomValues'>
    const ids = new Set(Array.from({ length: 200 }, () => newId(insecure)))
    expect(ids.size).toBe(200)
    for (const id of ids) expect(id).toMatch(UUID_V4)
  })

  it('sets the version and variant bits even from all-ones bytes', () => {
    const ones = { getRandomValues: <T extends ArrayBufferView | null>(array: T) => { new Uint8Array((array as Uint8Array).buffer).fill(0xff); return array } }
    expect(newId(ones as Pick<Crypto, 'getRandomValues'>)).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
  })
})
