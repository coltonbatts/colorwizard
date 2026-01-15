/**
 * useImageAnalyzer - High-performance buffer management for image analysis.
 * Handles Lab/Value buffer computation using Web Worker for non-blocking processing.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { wrap, Remote } from 'comlink';
import type { ImageProcessorWorker } from '@/lib/workers/imageProcessor.worker';
import { computeValueScale, ValueScaleResult } from '@/lib/valueScale';
import { ValueScaleSettings } from '@/lib/types/valueScale';


export interface LabBuffer {
    l: Float32Array;
    a: Float32Array;
    b: Float32Array;
    width: number;
    height: number;
}

export interface ValueBuffer {
    y: Float32Array;
    width: number;
    height: number;
}

export interface UseImageAnalyzerReturn {
    /** Lab color buffer for highlight system */
    labBuffer: LabBuffer | null;
    /** Value/luminance buffer for value overlay */
    valueBuffer: ValueBuffer | null;
    /** Sorted luminances for percentile calculations */
    sortedLuminances: Float32Array | null;
    /** Value scale result with thresholds */
    valueScaleResult: ValueScaleResult | null;
    /** Histogram bins (normalized) */
    histogramBins: number[];
    /** Whether analysis is in progress */
    isAnalyzing: boolean;
    /** Error message if worker failed */
    error: string | null;
    /** Recompute value scale with new settings */
    recomputeValueScale: () => void;
    /** Generate value map overlay data (runs in worker) */
    generateValueMapData: (thresholds: number[]) => Promise<Uint8ClampedArray | null>;
    /** Generate highlight overlay data (runs in worker) */
    generateHighlightOverlay: (
        targetR: number,
        targetG: number,
        targetB: number,
        tolerance: number,
        mode: 'solid' | 'heatmap'
    ) => Promise<Uint8ClampedArray | null>;
    /** Whether value map generation is in progress */
    isGeneratingValueMap: boolean;
    /** Whether highlight overlay generation is in progress */
    isGeneratingHighlight: boolean;
    /** Current breakdown buffers */
    breakdownBuffers: {
        imprimatura: Uint8ClampedArray | null;
        deadColor: Uint8ClampedArray | null;
        localColor: Uint8ClampedArray | null;
        spectralGlaze: Uint8ClampedArray | null;
    };
    /** Combined method to generate all breakdown layers */
    generateBreakdown: () => Promise<void>;
    /** Whether breakdown generation is in progress */
    isGeneratingBreakdown: boolean;
}

const MAX_PROCESS_DIM = 1000;

// Singleton worker instance to avoid recreating it
let workerInstance: Remote<ImageProcessorWorker> | null = null;
let workerPromise: Promise<Remote<ImageProcessorWorker>> | null = null;

async function getWorker(): Promise<Remote<ImageProcessorWorker>> {
    if (workerInstance) return workerInstance;

    if (workerPromise) return workerPromise;

    workerPromise = (async () => {
        const worker = new Worker(
            new URL('@/lib/workers/imageProcessor.worker.ts', import.meta.url),
            { type: 'module' }
        );
        workerInstance = wrap<ImageProcessorWorker>(worker);
        return workerInstance;
    })();

    return workerPromise;
}

export function useImageAnalyzer(
    image: HTMLImageElement | null,
    valueScaleSettings?: ValueScaleSettings
): UseImageAnalyzerReturn {
    const [labBuffer, setLabBuffer] = useState<LabBuffer | null>(null);
    const [valueBuffer, setValueBuffer] = useState<ValueBuffer | null>(null);
    const [sortedLuminances, setSortedLuminances] = useState<Float32Array | null>(null);
    const [valueScaleResult, setValueScaleResult] = useState<ValueScaleResult | null>(null);
    const [histogramBins, setHistogramBins] = useState<number[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGeneratingValueMap, setIsGeneratingValueMap] = useState(false);
    const [isGeneratingHighlight, setIsGeneratingHighlight] = useState(false);
    const [isGeneratingBreakdown, setIsGeneratingBreakdown] = useState(false);
    const [breakdownBuffers, setBreakdownBuffers] = useState<{
        imprimatura: Uint8ClampedArray | null;
        deadColor: Uint8ClampedArray | null;
        localColor: Uint8ClampedArray | null;
        spectralGlaze: Uint8ClampedArray | null;
    }>({
        imprimatura: null,
        deadColor: null,
        localColor: null,
        spectralGlaze: null,
    });

    // Track current image to handle race conditions
    const currentImageRef = useRef<HTMLImageElement | null>(null);

    // Process image when it changes
    useEffect(() => {
        if (!image) {
            setLabBuffer(null);
            setValueBuffer(null);
            setSortedLuminances(null);
            setValueScaleResult(null);
            setHistogramBins([]);
            setBreakdownBuffers({
                imprimatura: null,
                deadColor: null,
                localColor: null,
                spectralGlaze: null,
            });
            setError(null);
            currentImageRef.current = null;
            return;
        }

        // Track current image for race condition handling
        currentImageRef.current = image;
        setIsAnalyzing(true);
        setError(null);

        // Create a temporary canvas to read pixel data
        const canvas = document.createElement('canvas');
        let width = image.width;
        let height = image.height;

        // Limit processing resolution for performance
        if (width > MAX_PROCESS_DIM || height > MAX_PROCESS_DIM) {
            const ratio = Math.min(MAX_PROCESS_DIM / width, MAX_PROCESS_DIM / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setIsAnalyzing(false);
            setError('Failed to get canvas context');
            return;
        }

        ctx.drawImage(image, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        // Process in Web Worker
        (async () => {
            try {
                const worker = await getWorker();
                const result = await worker.processImageData(
                    imageData.data,
                    width,
                    height
                );

                // Check if this is still the current image (handle race conditions)
                if (currentImageRef.current !== image) {
                    return;
                }

                setLabBuffer(result.labBuffer);
                setValueBuffer(result.valueBuffer);
                setSortedLuminances(result.sortedLuminances);
                setHistogramBins(result.histogram);

                // Compute value scale from worker result
                const valueScale = computeValueScale(
                    result.valueBuffer.y,
                    valueScaleSettings?.steps || 5,
                    valueScaleSettings?.mode || 'Even',
                    valueScaleSettings?.clip || 0
                );
                setValueScaleResult(valueScale);

            } catch (err) {
                console.error('Worker processing failed:', err);
                setError(err instanceof Error ? err.message : 'Image processing failed');
            } finally {
                if (currentImageRef.current === image) {
                    setIsAnalyzing(false);
                }
            }
        })();

    }, [image]);

    // Recompute value scale when settings change
    useEffect(() => {
        if (!valueBuffer) return;

        const result = computeValueScale(
            valueBuffer.y,
            valueScaleSettings?.steps || 5,
            valueScaleSettings?.mode || 'Even',
            valueScaleSettings?.clip || 0
        );
        setValueScaleResult(result);
    }, [valueScaleSettings?.steps, valueScaleSettings?.mode, valueScaleSettings?.clip, valueBuffer]);

    const recomputeValueScale = useCallback(() => {
        if (!valueBuffer) return;

        const result = computeValueScale(
            valueBuffer.y,
            valueScaleSettings?.steps || 5,
            valueScaleSettings?.mode || 'Even',
            valueScaleSettings?.clip || 0
        );
        setValueScaleResult(result);
    }, [valueBuffer, valueScaleSettings]);

    // Generate value map overlay data in worker
    const generateValueMapData = useCallback(async (thresholds: number[]): Promise<Uint8ClampedArray | null> => {
        if (!valueBuffer) return null;

        setIsGeneratingValueMap(true);
        try {
            const worker = await getWorker();
            const data = await worker.generateValueMapData(
                valueBuffer.y,
                valueBuffer.width,
                valueBuffer.height,
                thresholds
            );
            return data;
        } catch (err) {
            console.error('Value map generation failed:', err);
            return null;
        } finally {
            setIsGeneratingValueMap(false);
        }
    }, [valueBuffer]);

    // Generate highlight overlay data in worker
    const generateHighlightOverlay = useCallback(async (
        targetR: number,
        targetG: number,
        targetB: number,
        tolerance: number,
        mode: 'solid' | 'heatmap'
    ): Promise<Uint8ClampedArray | null> => {
        if (!labBuffer) return null;

        setIsGeneratingHighlight(true);
        try {
            const worker = await getWorker();
            const data = await worker.generateHighlightOverlay(
                labBuffer,
                targetR,
                targetG,
                targetB,
                tolerance,
                mode
            );
            return data;
        } catch (err) {
            console.error('Highlight overlay generation failed:', err);
            return null;
        } finally {
            setIsGeneratingHighlight(false);
        }
    }, [labBuffer]);

    // Generate all breakdown layers
    const generateBreakdown = useCallback(async () => {
        if (!image || !valueBuffer) return;

        setIsGeneratingBreakdown(true);
        try {
            const worker = await getWorker();

            // Create a temporary canvas for raw image data needed by some breakdown steps
            const canvas = document.createElement('canvas');
            canvas.width = valueBuffer.width;
            canvas.height = valueBuffer.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            // Generate layers in parallel
            const [imprimatura, deadColor, localColor, spectralGlaze] = await Promise.all([
                worker.generateImprimatura(imageData, valueBuffer.width, valueBuffer.height),
                worker.generateValueBlockIn(valueBuffer.y, valueBuffer.width, valueBuffer.height),
                worker.generateLocalColor(imageData, valueBuffer.width, valueBuffer.height),
                worker.generateSpectralGlaze(imageData, valueBuffer.width, valueBuffer.height),
            ]);

            setBreakdownBuffers({
                imprimatura: imprimatura as Uint8ClampedArray,
                deadColor: deadColor as Uint8ClampedArray,
                localColor: localColor as Uint8ClampedArray,
                spectralGlaze: spectralGlaze as Uint8ClampedArray,
            });
        } catch (err) {
            console.error('Breakdown generation failed:', err);
            setError('Failed to generate breakdown layers');
        } finally {
            setIsGeneratingBreakdown(false);
        }
    }, [image, valueBuffer]);

    return {
        labBuffer,
        valueBuffer,
        sortedLuminances,
        valueScaleResult,
        histogramBins,
        isAnalyzing,
        error,
        recomputeValueScale,
        generateValueMapData,
        generateHighlightOverlay,
        isGeneratingValueMap,
        isGeneratingHighlight,
        breakdownBuffers,
        generateBreakdown,
        isGeneratingBreakdown,
    };
}
