/**
 * One lazily created worker that can be thrown away. Comlink has no way to cancel a call,
 * so a worker stuck on a job blocks every later call; `reset` terminates the thread and the
 * next `get` starts a fresh one.
 */
import { wrap, type Remote } from 'comlink'

export interface WorkerSlot<T> {
    /** The worker's API, created on first use and reused after that. */
    get(): Remote<T>
    /** Terminate the worker (if one was started); the next `get` creates a new one. */
    reset(): void
}

export function createWorkerSlot<T>(create: () => Worker, wrapWorker: (worker: Worker) => Remote<T> = wrap): WorkerSlot<T> {
    let worker: Worker | null = null
    let remote: Remote<T> | null = null
    return {
        get() {
            if (!remote) {
                worker = create()
                remote = wrapWorker(worker)
            }
            return remote
        },
        reset() {
            worker?.terminate()
            worker = null
            remote = null
        },
    }
}

export class WorkerTimeoutError extends Error {
    constructor(what: string, ms: number) {
        super(`${what} did not answer within ${ms} ms`)
        this.name = 'WorkerTimeoutError'
    }
}

/** `call`, or a WorkerTimeoutError after `ms`; the timer never outlives the race. */
export async function withTimeout<T>(call: Promise<T>, ms: number, what: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new WorkerTimeoutError(what, ms)), ms)
    })
    try {
        return await Promise.race([call, timeout])
    } finally {
        clearTimeout(timer)
    }
}
