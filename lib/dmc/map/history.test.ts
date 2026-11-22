import { describe, expect, it } from 'vitest'
import {
  createThreadMapHistory,
  pushThreadMapHistory,
  redoThreadMapHistory,
  undoThreadMapHistory,
  type ThreadMapControlSnapshot,
} from './history'

const BASE: ThreadMapControlSnapshot = {
  mode: 'full-color',
  fullColorBudget: 12,
  monochromeBudget: 7,
  monochromeTone: 'warm-grays',
  detail: 'painterly',
  fidelity: 'faithful',
  preferBox: false,
  lockedNumbers: [],
  swapOverrides: {},
  monoSwaps: {},
  anchorBudget: 12,
}

describe('ThreadMapHistory', () => {
  it('coalesces rapid slider drags into one undo step and supports full undo/redo', () => {
    let h = createThreadMapHistory(BASE)
    h = pushThreadMapHistory(h, { ...BASE, fullColorBudget: 13 }, { coalesceTag: 'budget', now: 1000 })
    h = pushThreadMapHistory(h, { ...BASE, fullColorBudget: 14 }, { coalesceTag: 'budget', now: 1120 })
    h = pushThreadMapHistory(h, { ...BASE, fullColorBudget: 16 }, { coalesceTag: 'budget', now: 1250 })

    expect(h.past.length).toBe(1)
    expect(h.present.fullColorBudget).toBe(16)

    // Subsequent distinct edit creates a new history entry.
    h = pushThreadMapHistory(h, { ...h.present, detail: 'crisp' }, { now: 1400 })
    expect(h.past.length).toBe(2)

    h = undoThreadMapHistory(h)
    expect(h.present.detail).toBe('painterly')
    expect(h.present.fullColorBudget).toBe(16)
    expect(h.future.length).toBe(1)

    h = undoThreadMapHistory(h)
    expect(h.present.fullColorBudget).toBe(12)
    expect(h.past.length).toBe(0)

    h = redoThreadMapHistory(h)
    expect(h.present.fullColorBudget).toBe(16)
    h = redoThreadMapHistory(h)
    expect(h.present.detail).toBe('crisp')

    // New edit after undo clears redo branch.
    h = undoThreadMapHistory(h)
    h = pushThreadMapHistory(h, { ...h.present, swapOverrides: { '892': '666' } }, { now: 2000 })
    expect(h.future.length).toBe(0)
    expect(h.present.swapOverrides['892']).toBe('666')
  })
})
