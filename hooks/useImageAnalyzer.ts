/**
 * useImageAnalyzer - High-performance buffer management for image analysis.
 * Handles Lab/Value buffer computation using Web Worker.
 */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { rgbToLab } from '@/lib/colorUtils';
import { getRelativeLuminance, computeValueScale, getStepIndex, ValueScaleResult, computeHistogram } from '@/lib/valueScale';
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
    /** Recompute value scale with new settings */
    recomputeValueScale: () => void;
}

const MAX_PROCESS_DIM = 1000;

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

    // Process image when it changes
    useEffect(() => {
        if (!image) {
            setLabBuffer(null);
            setValueBuffer(null);
            setSortedLuminances(null);
            setValueScaleResult(null);
            setHistogramBins([]);
            return;
        }

        setIsAnalyzing(true);

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
            return;
        }

        ctx.drawImage(image, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const pixelCount = width * height;

        // Process pixels (could be moved to worker for larger images)
        const lBuffer = new Float32Array(pixelCount);
        const aBuffer = new Float32Array(pixelCount);
        const bBuffer = new Float32Array(pixelCount);
        const yBuffer = new Float32Array(pixelCount);

        for (let i = 0; i < pixelCount; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];

            const lab = rgbToLab(r, g, b);
            lBuffer[i] = lab.l;
            aBuffer[i] = lab.a;
            bBuffer[i] = lab.b;

            yBuffer[i] = getRelativeLuminance(r, g, b);
        }

        setLabBuffer({
            l: lBuffer,
            a: aBuffer,
            b: bBuffer,
            width,
            height,
        });

        setValueBuffer({
            y: yBuffer,
            width,
            height,
        });

        const sorted = new Float32Array(yBuffer).sort();
        setSortedLuminances(sorted);

        // Compute histogram
        const bins = computeHistogram(yBuffer);
        setHistogramBins(bins);

        // Compute initial value scale
        const result = computeValueScale(
            yBuffer,
            valueScaleSettings?.steps || 5,
            valueScaleSettings?.mode || 'Even',
            valueScaleSettings?.clip || 0
        );
        setValueScaleResult(result);

        setIsAnalyzing(false);
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
        recomputeValueScale,
    };
}
