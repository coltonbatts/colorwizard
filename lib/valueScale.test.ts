import { describe, it, expect } from 'vitest';
import { sRGBToLinear, getRelativeLuminance, computeValueScale, getStepIndex } from './valueScale';

describe('valueScale core logic', () => {
    it('sRGBToLinear conversion', () => {
        // Known points
        expect(sRGBToLinear(0)).toBe(0);
        expect(sRGBToLinear(255)).toBe(1);
        // Mid point approx
        expect(sRGBToLinear(128)).toBeCloseTo(0.216, 3);
    });

    it('getRelativeLuminance for primaries', () => {
        // Pure Red: Y = 0.2126
        expect(getRelativeLuminance(255, 0, 0)).toBeCloseTo(0.2126, 4);
        // Pure Green: Y = 0.7152
        expect(getRelativeLuminance(0, 255, 0)).toBeCloseTo(0.7152, 4);
        // Pure Blue: Y = 0.0722
        expect(getRelativeLuminance(0, 0, 255)).toBeCloseTo(0.0722, 4);
        // White: Y = 1.0
        expect(getRelativeLuminance(255, 255, 255)).toBeCloseTo(1.0, 4);
        // Black: Y = 0.0
        expect(getRelativeLuminance(0, 0, 0)).toBe(0);
    });

    it('computeValueScale Even mode', () => {
        const data = new Float32Array([0.1, 0.2, 0.5, 0.8, 0.9]);
        const result = computeValueScale(data, 5, 'Even', 0);
        expect(result.thresholds).toHaveLength(6);
        expect(result.blackPoint).toBeCloseTo(0.1, 4);
        expect(result.whitePoint).toBeCloseTo(0.9, 4);

        // blackPoint is 0.1, whitePoint is 0.9, range is 0.8. Step size is 0.16.
        // thresholds: 0.1, 0.26, 0.42, 0.58, 0.74, 0.9
        expect(result.thresholds[0]).toBeCloseTo(0.1, 4);
        expect(result.thresholds[1]).toBeCloseTo(0.26, 4);
        expect(result.thresholds[2]).toBeCloseTo(0.42, 4);
        expect(result.thresholds[3]).toBeCloseTo(0.58, 4);
        expect(result.thresholds[4]).toBeCloseTo(0.74, 4);
        expect(result.thresholds[5]).toBeCloseTo(0.9, 4);
    });

    it('computeValueScale Percentile mode', () => {
        // 10 pixels, 5 steps -> 2 pixels per step
        const data = new Float32Array([0.1, 0.1, 0.3, 0.3, 0.5, 0.5, 0.7, 0.7, 0.9, 0.9]);
        const result = computeValueScale(data, 5, 'Percentile', 0);
        // sorted: [0.1, 0.1, 0.3, 0.3, 0.5, 0.5, 0.7, 0.7, 0.9, 0.9]
        // indices: 0, 2, 4, 6, 8, 9
        // thresholds: sorted[0], sorted[2], sorted[4], sorted[6], sorted[8], sorted[9]
        expect(result.thresholds[0]).toBeCloseTo(0.1, 4);
        expect(result.thresholds[1]).toBeCloseTo(0.3, 4);
        expect(result.thresholds[2]).toBeCloseTo(0.5, 4);
        expect(result.thresholds[3]).toBeCloseTo(0.7, 4);
        expect(result.thresholds[4]).toBeCloseTo(0.9, 4);
        expect(result.thresholds[5]).toBeCloseTo(0.9, 4);
    });

    it('getStepIndex binary search', () => {
        const thresholds = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
        expect(getStepIndex(0.1, thresholds)).toBe(0);
        expect(getStepIndex(0.25, thresholds)).toBe(1);
        expect(getStepIndex(0.5, thresholds)).toBe(2);
        expect(getStepIndex(0.95, thresholds)).toBe(4);
        expect(getStepIndex(1.0, thresholds)).toBe(4);
        expect(getStepIndex(0, thresholds)).toBe(0);
    });

    it('clipping logic', () => {
        const data = new Float32Array([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);
        // 11 elements, 10% clip (approx 1 element each side)
        const result = computeValueScale(data, 5, 'Even', 0.1);
        // sorted[floor(11 * 0.1)] = sorted[1] = 0.1
        // sorted[floor(11 * 0.9)] = sorted[9] = 0.9
        expect(result.blackPoint).toBeCloseTo(0.1, 1);
        expect(result.whitePoint).toBeCloseTo(0.9, 1);
    });
});
