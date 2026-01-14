/**
 * useValueOverlay - Manages value map rendering for the canvas.
 */
'use client';

import { useRef, useEffect, useCallback } from 'react';
import { getStepIndex, stepToGray, ValueScaleResult } from '@/lib/valueScale';
import type { ValueBuffer } from './useImageAnalyzer';

export interface UseValueOverlayReturn {
    /** Canvas ref for the value map overlay */
    valueMapCanvasRef: React.RefObject<HTMLCanvasElement | null>;
    /** Draw the value map to the canvas */
    drawValueMap: () => void;
}

export function useValueOverlay(
    valueBuffer: ValueBuffer | null,
    valueScaleResult: ValueScaleResult | null,
    enabled: boolean = false
): UseValueOverlayReturn {
    const valueMapCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const drawValueMap = useCallback(() => {
        const canvas = valueMapCanvasRef.current;
        if (!canvas || !valueBuffer || !valueScaleResult || !enabled) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize canvas if needed
        if (canvas.width !== valueBuffer.width || canvas.height !== valueBuffer.height) {
            canvas.width = valueBuffer.width;
            canvas.height = valueBuffer.height;
        }

        const imageData = ctx.createImageData(valueBuffer.width, valueBuffer.height);
        const data = imageData.data;
        const { y: yBuffer } = valueBuffer;
        const pixelCount = yBuffer.length;

        const thresholds = valueScaleResult.thresholds;
        const numSteps = thresholds.length - 1;

        for (let i = 0; i < pixelCount; i++) {
            const y = yBuffer[i];
            const stepIdx = getStepIndex(y, thresholds);

            // Use stepToGray for consistent quantization
            const val = stepToGray(stepIdx, numSteps);

            const idx = i * 4;
            data[idx] = val;
            data[idx + 1] = val;
            data[idx + 2] = val;
            data[idx + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
    }, [valueBuffer, valueScaleResult, enabled]);

    // Auto-draw when dependencies change
    useEffect(() => {
        drawValueMap();
    }, [drawValueMap]);

    return {
        valueMapCanvasRef,
        drawValueMap,
    };
}
