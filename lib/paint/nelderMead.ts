/**
 * Nelder-Mead Simplex Optimization for Paint Mixing.
 * 
 * This gradient-free optimization algorithm refines pigment weights
 * to achieve "True Zero" color matches (ΔE < 0.5).
 * 
 * The simplex operates in weight-space, where each vertex represents
 * a different weight configuration. The algorithm iteratively improves
 * the worst vertex through reflection, expansion, contraction, and shrinkage.
 */
import { mixPigmentsSync, deltaESync, getCachedColorSync } from '../spectral/adapter';
import type { MixInput } from '../spectral/types';
import type { Color as SpectralColor } from 'spectral.js';

export interface NelderMeadOptions {
    /** Maximum iterations before termination */
    maxIterations?: number;
    /** Convergence tolerance for ΔE */
    tolerance?: number;
    /** Reflection coefficient (> 0, typically 1) */
    alpha?: number;
    /** Expansion coefficient (> 1, typically 2) */
    gamma?: number;
    /** Contraction coefficient (0 < ρ < 1, typically 0.5) */
    rho?: number;
    /** Shrinkage coefficient (0 < σ < 1, typically 0.5) */
    sigma?: number;
}

export interface NelderMeadResult {
    inputs: MixInput[];
    hex: string;
    error: number;
    iterations: number;
    converged: boolean;
}

interface Vertex {
    weights: number[];
    error: number;
    hex: string;
}

/**
 * Normalize weights to sum to 1.0 and clamp to valid range.
 */
function normalizeWeights(weights: number[]): number[] {
    // Clamp to non-negative
    const clamped = weights.map(w => Math.max(0, w));
    const sum = clamped.reduce((a, b) => a + b, 0);

    if (sum === 0) {
        // Fallback to equal weights
        return clamped.map(() => 1 / clamped.length);
    }

    return clamped.map(w => w / sum);
}

/**
 * Evaluate a weight configuration against the target color.
 */
function evaluateWeights(
    pigmentIds: string[],
    weights: number[],
    targetColor: SpectralColor,
    minWeight: number
): Vertex | null {
    const normalizedWeights = normalizeWeights(weights);

    // Build inputs, filtering out negligible weights
    const inputs: MixInput[] = [];
    for (let i = 0; i < pigmentIds.length; i++) {
        if (normalizedWeights[i] >= minWeight) {
            inputs.push({
                pigmentId: pigmentIds[i],
                weight: normalizedWeights[i],
            });
        }
    }

    if (inputs.length === 0) return null;

    try {
        const result = mixPigmentsSync(inputs);
        const error = deltaESync(result.spectralColor, targetColor);
        return {
            weights: normalizedWeights,
            error,
            hex: result.hex,
        };
    } catch {
        return null;
    }
}

/**
 * Compute the centroid of all vertices except the worst.
 */
function computeCentroid(vertices: Vertex[], worstIndex: number): number[] {
    const n = vertices[0].weights.length;
    const centroid = new Array(n).fill(0);
    let count = 0;

    for (let i = 0; i < vertices.length; i++) {
        if (i !== worstIndex) {
            for (let j = 0; j < n; j++) {
                centroid[j] += vertices[i].weights[j];
            }
            count++;
        }
    }

    return centroid.map(c => c / count);
}

/**
 * Reflect a point through the centroid.
 */
function reflect(centroid: number[], worst: number[], alpha: number): number[] {
    return centroid.map((c, i) => c + alpha * (c - worst[i]));
}

/**
 * Expand a point beyond the reflection.
 */
function expand(centroid: number[], reflected: number[], gamma: number): number[] {
    return centroid.map((c, i) => c + gamma * (reflected[i] - c));
}

/**
 * Contract a point toward the centroid.
 */
function contract(centroid: number[], point: number[], rho: number): number[] {
    return centroid.map((c, i) => c + rho * (point[i] - c));
}

/**
 * Shrink all vertices toward the best vertex.
 */
function shrink(vertices: Vertex[], bestIndex: number, sigma: number): number[][] {
    const best = vertices[bestIndex].weights;
    return vertices.map((v, i) => {
        if (i === bestIndex) return v.weights;
        return best.map((b, j) => b + sigma * (v.weights[j] - b));
    });
}

/**
 * Nelder-Mead simplex optimization for paint mixing.
 * 
 * @param initialInputs - Starting pigment weight configuration
 * @param targetColor - Target spectral color to match
 * @param options - Optimization parameters
 * @returns Optimized weights and error
 */
export function nelderMeadOptimize(
    initialInputs: MixInput[],
    targetColor: SpectralColor,
    options: NelderMeadOptions = {}
): NelderMeadResult {
    const {
        maxIterations = 100,
        tolerance = 0.5,
        alpha = 1.0,
        gamma = 2.0,
        rho = 0.5,
        sigma = 0.5,
    } = options;

    const pigmentIds = initialInputs.map(i => i.pigmentId);
    const n = pigmentIds.length;
    const minWeight = 0.01;

    // Initialize simplex with n+1 vertices
    // Start with initial weights and perturb for other vertices
    const initialWeights = initialInputs.map(i => i.weight);
    const vertices: Vertex[] = [];

    // Add initial vertex
    const initial = evaluateWeights(pigmentIds, initialWeights, targetColor, minWeight);
    if (!initial) {
        return {
            inputs: initialInputs,
            hex: '#808080',
            error: 100,
            iterations: 0,
            converged: false,
        };
    }
    vertices.push(initial);

    // Generate perturbed vertices
    const perturbSize = 0.1;
    for (let i = 0; i < n; i++) {
        const perturbed = [...initialWeights];
        perturbed[i] = Math.max(minWeight, perturbed[i] + perturbSize);
        const vertex = evaluateWeights(pigmentIds, perturbed, targetColor, minWeight);
        if (vertex) {
            vertices.push(vertex);
        } else {
            // Fallback: use slightly different perturbation
            perturbed[i] = Math.max(minWeight, initialWeights[i] - perturbSize / 2);
            const fallback = evaluateWeights(pigmentIds, perturbed, targetColor, minWeight);
            if (fallback) vertices.push(fallback);
            else vertices.push({ ...initial }); // Clone initial as last resort
        }
    }

    // Ensure we have n+1 vertices
    while (vertices.length < n + 1) {
        vertices.push({ ...initial });
    }

    let iterations = 0;
    let converged = false;

    // Main optimization loop
    while (iterations < maxIterations) {
        // Sort vertices by error (ascending)
        vertices.sort((a, b) => a.error - b.error);

        const best = vertices[0];
        const worst = vertices[vertices.length - 1];
        const secondWorst = vertices[vertices.length - 2];

        // Check convergence
        if (best.error <= tolerance) {
            converged = true;
            break;
        }

        // Check if simplex has collapsed
        const spread = worst.error - best.error;
        if (spread < 0.001) {
            break;
        }

        iterations++;

        // Compute centroid of all points except worst
        const worstIndex = vertices.length - 1;
        const centroid = computeCentroid(vertices, worstIndex);

        // Reflect
        const reflectedWeights = reflect(centroid, worst.weights, alpha);
        const reflected = evaluateWeights(pigmentIds, reflectedWeights, targetColor, minWeight);

        if (reflected && reflected.error < secondWorst.error && reflected.error >= best.error) {
            // Accept reflection
            vertices[worstIndex] = reflected;
            continue;
        }

        if (reflected && reflected.error < best.error) {
            // Try expansion
            const expandedWeights = expand(centroid, reflected.weights, gamma);
            const expanded = evaluateWeights(pigmentIds, expandedWeights, targetColor, minWeight);

            if (expanded && expanded.error < reflected.error) {
                vertices[worstIndex] = expanded;
            } else {
                vertices[worstIndex] = reflected;
            }
            continue;
        }

        // Contract
        const contractPoint = (reflected && reflected.error < worst.error) ? reflected.weights : worst.weights;
        const contractedWeights = contract(centroid, contractPoint, rho);
        const contracted = evaluateWeights(pigmentIds, contractedWeights, targetColor, minWeight);

        if (contracted && contracted.error < worst.error) {
            vertices[worstIndex] = contracted;
            continue;
        }

        // Shrink
        const shrunkWeightsList = shrink(vertices, 0, sigma);
        for (let i = 1; i < vertices.length; i++) {
            const shrunk = evaluateWeights(pigmentIds, shrunkWeightsList[i], targetColor, minWeight);
            if (shrunk) {
                vertices[i] = shrunk;
            }
        }
    }

    // Return best result
    vertices.sort((a, b) => a.error - b.error);
    const best = vertices[0];

    const resultInputs: MixInput[] = [];
    for (let i = 0; i < pigmentIds.length; i++) {
        if (best.weights[i] >= minWeight) {
            resultInputs.push({
                pigmentId: pigmentIds[i],
                weight: best.weights[i],
            });
        }
    }

    return {
        inputs: resultInputs,
        hex: best.hex,
        error: best.error,
        iterations,
        converged,
    };
}

/**
 * Refine a candidate solution using Nelder-Mead optimization.
 * Drop-in replacement for the grid-based refineCandidateSync.
 */
export function nelderMeadRefine(
    candidate: { inputs: MixInput[]; hex: string; error: number },
    targetColor: SpectralColor,
    options?: NelderMeadOptions
): { inputs: MixInput[]; hex: string; error: number } {
    const result = nelderMeadOptimize(candidate.inputs, targetColor, options);

    // Only use optimized result if it's better
    if (result.error < candidate.error) {
        return {
            inputs: result.inputs,
            hex: result.hex,
            error: result.error,
        };
    }

    return candidate;
}
