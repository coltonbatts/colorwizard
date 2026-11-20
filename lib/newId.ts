/**
 * A random v4 UUID. `crypto.randomUUID` exists only in secure contexts (HTTPS, localhost), so a
 * page opened over a local network address (http://192.168.…, e.g. testing on a tablet) would
 * throw on save; `crypto.getRandomValues` works everywhere and builds the same format.
 */
export function newId(cryptoImpl: Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>> = globalThis.crypto): string {
  if (typeof cryptoImpl.randomUUID === 'function') return cryptoImpl.randomUUID()
  const bytes = cryptoImpl.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
