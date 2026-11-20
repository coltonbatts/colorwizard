/**
 * Comlink wrapper utilities for Web Workers.
 * Provides type-safe, RPC-style communication with workers.
 */
import type { Remote } from 'comlink';
import type { SolverWorkerAPI } from '../paint/solver.worker';
import type { ImageProcessorWorker } from './imageProcessor.worker';
import type { PlanWorkerAPI } from '../paint/plan/plan.worker';
import { createWorkerSlot } from './slot';

export { withTimeout, WorkerTimeoutError } from './slot';

// Singleton worker instances
const solverSlot = createWorkerSlot<SolverWorkerAPI>(
    () => new Worker(new URL('../paint/solver.worker.ts', import.meta.url), { type: 'module' })
);
const planSlot = createWorkerSlot<PlanWorkerAPI>(
    () => new Worker(new URL('../paint/plan/plan.worker.ts', import.meta.url), { type: 'module' })
);
const imageProcessorSlot = createWorkerSlot<ImageProcessorWorker>(
    () => new Worker(new URL('./imageProcessor.worker.ts', import.meta.url), { type: 'module' })
);

/**
 * Get the solver worker instance.
 * Creates worker on first call, reuses on subsequent calls.
 */
export function getSolverWorker(): Remote<SolverWorkerAPI> {
    return solverSlot.get();
}

/** Terminate the solver worker (e.g. after it timed out); the next call starts a new one. */
export function resetSolverWorker(): void {
    solverSlot.reset();
}

/**
 * Get the paint plan worker instance (plans a whole picture off the main thread).
 * Creates worker on first call, reuses on subsequent calls.
 */
export function getPlanWorker(): Remote<PlanWorkerAPI> {
    return planSlot.get();
}

/** Terminate the plan worker (e.g. after it timed out); the next call starts a new one. */
export function resetPlanWorker(): void {
    planSlot.reset();
}

/**
 * Get the image processor worker instance.
 * Creates worker on first call, reuses on subsequent calls.
 */
export function getImageProcessorWorker(): Remote<ImageProcessorWorker> {
    return imageProcessorSlot.get();
}

/**
 * Terminate all workers (for cleanup).
 */
export function terminateWorkers(): void {
    solverSlot.reset();
    imageProcessorSlot.reset();
    planSlot.reset();
}

/**
 * Check if Web Workers are supported in this environment.
 */
export function isWorkerSupported(): boolean {
    return typeof Worker !== 'undefined';
}
