import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}))

import {
  initDatabase,
  resolveTauriImageSrc,
  sanitizeDesktopProjectImageSrc,
} from './tauriClient'

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('tauriClient invoke', () => {
  it('turns synchronous invoke failures into rejected promises', async () => {
    ;(globalThis as unknown as {
      window: {
        __TAURI_INTERNALS__: {
          invoke: () => never
        }
      }
    }).window = {
      __TAURI_INTERNALS__: {
        invoke: () => {
          throw new Error('boom')
        },
      },
    }

    await expect(initDatabase()).rejects.toThrow('boom')
  })

  it('normalizes persisted asset URLs before storing desktop image paths', () => {
    expect(
      sanitizeDesktopProjectImageSrc(
        'asset://localhost/%2FUsers%2Fcoltonbatts%2FDesktop%2Fstudy.jpg',
      ),
    ).toBe('/Users/coltonbatts/Desktop/study.jpg')
  })

  it('resolves asset URLs when the file-src converter exists even without invoke', () => {
    ;(globalThis as unknown as {
      window: {
        __TAURI_INTERNALS__: {
          convertFileSrc: (path: string) => string
        }
      }
    }).window = {
      __TAURI_INTERNALS__: {
        convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
      },
    }

    expect(
      resolveTauriImageSrc(
        'asset://localhost/%2FUsers%2Fcoltonbatts%2FDesktop%2Fstudy.jpg',
      ),
    ).toBe('asset://localhost/%2FUsers%2Fcoltonbatts%2FDesktop%2Fstudy.jpg')
  })
})
