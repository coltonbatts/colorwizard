import { describe, it, expect } from 'vitest'
import { newCanvasDraft, storeCanvasDraft } from '@/lib/paint/canvasSetup'
import {
  DRAFT_RESTORED_STATUS,
  DRAFT_SAVED_STATUS,
  DRAFT_SAVE_FAILED_STATUS,
  applyLockedFace,
  buildCanvasLandmark,
  tryPersistCanvasDraft,
  tryRestoreCanvasDraft,
} from './useCanvasSetupState'

function makeMemoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  }
}

describe('useCanvasSetupState helpers', () => {
  it('creates a new draft when locking a face with no existing draft and preserves landmarks when re-locking', () => {
    const initial = applyLockedFace(null, { width: 24, height: 30 })
    expect(initial.face).toEqual({ width: 24, height: 30 })
    expect(initial.landmarks).toEqual([])

    const withMark = {
      ...initial,
      landmarks: [
        buildCanvasLandmark({
          existingCount: 0,
          sourcePoint: { x: 0.25, y: 0.5 },
          id: 'lm-1',
        }),
      ],
    }
    const relocked = applyLockedFace(withMark, { width: 16, height: 20 })
    expect(relocked.face).toEqual({ width: 16, height: 20 })
    expect(relocked.landmarks).toHaveLength(1)
    expect(relocked.landmarks[0].name).toBe('Mark 1')
  })

  it('builds plain landmarks and mix-trial landmarks with normalized uppercase hex', () => {
    const plain = buildCanvasLandmark({
      existingCount: 2,
      sourcePoint: { x: 0.4, y: 0.6 },
      id: 'lm-3',
    })
    expect(plain).toEqual({ id: 'lm-3', name: 'Mark 3', x: 0.4, y: 0.6 })

    const trial = buildCanvasLandmark({
      existingCount: 3,
      sourcePoint: { x: 0.1, y: 0.2 },
      id: 'lm-4',
      trialHex: '#a1b2c3',
    })
    expect(trial).toEqual({
      id: 'lm-4',
      name: 'Mix trial 4',
      x: 0.1,
      y: 0.2,
      trial: { hex: '#A1B2C3', measured: '', correction: '', acceptedPalette: null },
    })
  })

  it('persists and restores a canvas draft with the expected status copy', () => {
    const storage = makeMemoryStorage()
    const draft = newCanvasDraft({ width: 18, height: 24 })

    const persistResult = tryPersistCanvasDraft(storage, 'pic-key-1', draft)
    expect(persistResult).toEqual({ saved: true, status: DRAFT_SAVED_STATUS })

    const restored = tryRestoreCanvasDraft(storage, 'pic-key-1')
    expect(restored.draft).toEqual(draft)
    expect(restored.status).toBe(DRAFT_RESTORED_STATUS)

    const mismatch = tryRestoreCanvasDraft(storage, 'other-pic-key')
    expect(mismatch).toEqual({ draft: null, status: null })
  })

  it('handles blocked storage and missing picture key without throwing', () => {
    const draft = newCanvasDraft({ width: 18, height: 24 })
    const throwingStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }

    expect(tryRestoreCanvasDraft(throwingStorage, 'pic-key-1')).toEqual({
      draft: null,
      status: null,
    })
    expect(tryPersistCanvasDraft(throwingStorage, 'pic-key-1', draft)).toEqual({
      saved: false,
      status: DRAFT_SAVE_FAILED_STATUS,
    })

    const memory = makeMemoryStorage()
    storeCanvasDraft(memory, 'pic-key-1', draft)
    expect(tryPersistCanvasDraft(memory, null, draft)).toEqual({
      saved: false,
      status: DRAFT_SAVE_FAILED_STATUS,
    })
  })
})
