/**
 * Comlink wrapper utilities for Web Workers.
 * Provides type-safe, RPC-style communication with workers.
 */
import { wrap, type Remote } from 'comlink';
import type { SolverWorkerAPI } from '../paint/solver.worker';
import type { ImageProcessorWorker } from './imageProcessor.worker';

// Singleton worker instances
let solverWorker: Remote<SolverWorkerAPI> | null = null;
let imageProcessorWorker: Remote<ImageProcessorWorker> | null = null;

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
}

/**
 * Check if Web Workers are supported in this environment.
 */
export function isWorkerSupported(): boolean {
    return typeof Worker !== 'undefined';
}
