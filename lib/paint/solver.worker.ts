/**
 * Solver Web Worker.
 * Handles paint recipe solving off the main thread for silky-smooth UI.
 * Uses Comlink for clean RPC-style communication.
 */
import { expose } from 'comlink';
import { solveRecipe, mixInteractive, mixInteractiveWithError, SolveOptions } from './solveRecipe';
import type { SpectralRecipe } from '../spectral/types';

export interface SolverWorkerAPI {
    solveRecipe: (targetHex: string, options?: SolveOptions) => Promise<SpectralRecipe>;
    mixInteractive: (inputs: Array<{ pigmentId: string; weight: number }>) => Promise<{ hex: string; error?: number; targetHex?: string }>;
    mixInteractiveWithError: (inputs: Array<{ pigmentId: string; weight: number }>, targetHex: string) => Promise<{ hex: string; error: number }>;
}

const workerAPI: SolverWorkerAPI = {
    solveRecipe,
    mixInteractive,
    mixInteractiveWithError,
};

expose(workerAPI);
