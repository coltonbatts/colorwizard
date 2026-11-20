import { describe, expect, it, vi } from 'vitest'
import type { Remote } from 'comlink'
import { createWorkerSlot, withTimeout, WorkerTimeoutError } from './slot'

function fakeWorker() {
  return { terminate: vi.fn() } as unknown as Worker & { terminate: ReturnType<typeof vi.fn> }
}

describe('createWorkerSlot', () => {
  it('creates the worker once and reuses it', () => {
    const create = vi.fn(fakeWorker)
    const slot = createWorkerSlot<object>(create, (worker) => ({ worker }) as unknown as Remote<object>)
    expect(slot.get()).toBe(slot.get())
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('reset terminates the thread and the next get starts a new one', () => {
    const workers: ReturnType<typeof fakeWorker>[] = []
    const slot = createWorkerSlot<object>(() => {
      const worker = fakeWorker()
      workers.push(worker)
      return worker
    }, (worker) => ({ worker }) as unknown as Remote<object>)
    const first = slot.get()
    slot.reset()
    expect(workers[0].terminate).toHaveBeenCalledTimes(1)
    const second = slot.get()
    expect(second).not.toBe(first)
    expect(workers).toHaveLength(2)
  })

  it('reset before any worker exists does nothing', () => {
    const create = vi.fn(fakeWorker)
    const slot = createWorkerSlot<object>(create, (worker) => ({ worker }) as unknown as Remote<object>)
    expect(() => slot.reset()).not.toThrow()
    expect(create).not.toHaveBeenCalled()
  })
})

describe('withTimeout', () => {
  it('returns the answer and clears its timer', async () => {
    vi.useFakeTimers()
    try {
      await expect(withTimeout(Promise.resolve(42), 1000, 'Test worker')).resolves.toBe(42)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects with a WorkerTimeoutError when the call never answers', async () => {
    vi.useFakeTimers()
    try {
      const pending = withTimeout(new Promise<number>(() => {}), 1000, 'Test worker')
      const settled = expect(pending).rejects.toBeInstanceOf(WorkerTimeoutError)
      await vi.advanceTimersByTimeAsync(1000)
      await settled
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('passes a worker error through unchanged', async () => {
    const failure = new Error('boom')
    await expect(withTimeout(Promise.reject(failure), 1000, 'Test worker')).rejects.toBe(failure)
  })
})
