/**
 * useImageAnalyzer - High-performance buffer management for image analysis.
 * Handles Lab/Value buffer computation using Web Worker for non-blocking processing.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { wrap, Remote } from 'comlink';
import type { ImageProcessorWorker, ImageBufferResult, ValueScaleResult as WorkerValueScaleResult } from '@/lib/workers/imageProcessor.worker';
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

    return {
        labBuffer,
        valueBuffer,
        sortedLuminances,
        valueScaleResult,
        histogramBins,
        isAnalyzing,
        error,
        recomputeValueScale,
    };
}
