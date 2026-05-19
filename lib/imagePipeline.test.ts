import { describe, expect, it } from 'vitest';
import { computeScaledDimensions, MAX_SOURCE_DIM } from './imagePipeline';

describe('computeScaledDimensions', () => {
    it('returns original dimensions when within max', () => {
        expect(computeScaledDimensions(800, 600, MAX_SOURCE_DIM)).toEqual({
            width: 800,
            height: 600,
        });
    });

    it('scales down the longest edge to maxDim', () => {
        expect(computeScaledDimensions(4000, 2000, 2048)).toEqual({
            width: 2048,
            height: 1024,
        });
    });

    it('handles portrait orientation', () => {
        expect(computeScaledDimensions(3024, 4032, 2048)).toEqual({
            width: 1536,
            height: 2048,
        });
    });

    it('returns zero dimensions for invalid input', () => {
        expect(computeScaledDimensions(0, 100, 2048)).toEqual({ width: 0, height: 0 });
    });
});
