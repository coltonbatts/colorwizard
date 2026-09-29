/**
 * Comlink wrapper utilities for Web Workers.
 * Provides type-safe, RPC-style communication with workers.
 */
import { wrap, type Remote } from 'comlink';
import type { SolverWorkerAPI } from '../paint/solver.worker';
import type { ImageProcessorWorker } from './imageProcessor.worker';
import type { PlanWorkerAPI } from '../paint/plan/plan.worker';

// Singleton worker instances
let solverWorker: Remote<SolverWorkerAPI> | null = null;
let imageProcessorWorker: Remote<ImageProcessorWorker> | null = null;
let planWorker: Remote<PlanWorkerAPI> | null = null;

/**
 * Get the solver worker instance.
 * Creates worker on first call, reuses on subsequent calls.
 */
export function getSolverWorker(): Remote<SolverWorkerAPI> {
    if (!solverWorker) {
        const worker = new Worker(
            new URL('../paint/solver.worker.ts', import.meta.url),
            { type: 'module' }
        );
        solverWorker = wrap<SolverWorkerAPI>(worker);
    }
    return solverWorker;
}

/**
 * Get the paint plan worker instance (plans a whole picture off the main thread).
 * Creates worker on first call, reuses on subsequent calls.
 */
export function getPlanWorker(): Remote<PlanWorkerAPI> {
    if (!planWorker) {
        const worker = new Worker(
            new URL('../paint/plan/plan.worker.ts', import.meta.url),
            { type: 'module' }
        );
        planWorker = wrap<PlanWorkerAPI>(worker);
    }
    return planWorker;
}

/**
 * Get the image processor worker instance.
 * Creates worker on first call, reuses on subsequent calls.
 */
export function getImageProcessorWorker(): Remote<ImageProcessorWorker> {
    if (!imageProcessorWorker) {
        const worker = new Worker(
            new URL('./imageProcessor.worker.ts', import.meta.url),
            { type: 'module' }
        );
        imageProcessorWorker = wrap<ImageProcessorWorker>(worker);
    }
    return imageProcessorWorker;
}

/**
 * Terminate all workers (for cleanup).
 */
export function terminateWorkers(): void {
    solverWorker = null;
    imageProcessorWorker = null;
    planWorker = null;
}

/**
 * Check if Web Workers are supported in this environment.
 */
export function isWorkerSupported(): boolean {
    return typeof Worker !== 'undefined';
}
