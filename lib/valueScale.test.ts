import { describe, it, expect } from 'vitest';
import {
    sRGBToLinear,
    getRelativeLuminance,
    computeValueScale,
    getStepIndex,
    stepToGray,
    linearToSRGB,
    luminanceToValue01,
    value01ToLuminance,
    value01ToGrayByte,
} from './valueScale';

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

    it('computeValueScale Even mode spaces steps evenly in perceptual value', () => {
        const data = new Float32Array([0.1, 0.2, 0.5, 0.8, 0.9]);
        const result = computeValueScale(data, 5, 'Even', 0);
        expect(result.thresholds).toHaveLength(6);
        expect(result.blackPoint).toBeCloseTo(0.1, 4);
        expect(result.whitePoint).toBeCloseTo(0.9, 4);

        // Endpoints are preserved exactly.
        expect(result.thresholds[0]).toBeCloseTo(0.1, 4);
        expect(result.thresholds[5]).toBeCloseTo(0.9, 4);

        // A painter's value scale is evenly spaced in value, not in luminance. (This test
        // previously asserted luminance-even thresholds, which put the entire shadow family
        // in the bottom step.)
        const values = result.thresholds.map(luminanceToValue01);
        const gaps = values.slice(1).map((v, i) => v - values[i]);
        for (const gap of gaps) {
            expect(gap).toBeCloseTo(gaps[0], 6);
        }

        // The consequence that matters: dark steps become narrow luminance bands, so
        // shadows separate instead of collapsing into one tone.
        const darkestSpan = result.thresholds[1] - result.thresholds[0];
        const lightestSpan = result.thresholds[5] - result.thresholds[4];
        expect(darkestSpan).toBeLessThan(lightestSpan);
    });

    it('stepToGray paints each step at the gray of its own value', () => {
        // 9-step scale: the middle step is the neutral a painter calls value 5.
        expect(stepToGray(4, 9)).toBe(value01ToGrayByte(0.5));
        expect(stepToGray(0, 9)).toBe(0);
        expect(stepToGray(8, 9)).toBe(255);
        // Evenly spaced in value means monotonically increasing grays.
        const grays = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => stepToGray(s, 9));
        for (let i = 1; i < grays.length; i++) {
            expect(grays[i]).toBeGreaterThan(grays[i - 1]);
        }
    });

    describe('perceptual value conversions', () => {
        it('reports middle gray as value 5, not 2', () => {
            const y = getRelativeLuminance(128, 128, 128);
            expect(y).toBeCloseTo(0.216, 3); // luminance is genuinely ~22%
            expect(luminanceToValue01(y) * 10).toBeCloseTo(5.4, 1); // but value is ~5.4/10
        });

        it('round-trips value and luminance', () => {
            for (const v of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
                expect(luminanceToValue01(value01ToLuminance(v))).toBeCloseTo(v, 6);
            }
        });

        it('renders a value back to the gray of that value', () => {
            // The neutral of value 5.4 is middle gray again - the round trip the value
            // chip depends on.
            expect(value01ToGrayByte(luminanceToValue01(getRelativeLuminance(128, 128, 128)))).toBe(128);
            expect(value01ToGrayByte(0)).toBe(0);
            expect(value01ToGrayByte(1)).toBe(255);
        });

        it('linearToSRGB inverts sRGBToLinear', () => {
            for (const byte of [0, 32, 64, 128, 200, 255]) {
                expect(Math.round(linearToSRGB(sRGBToLinear(byte)) * 255)).toBe(byte);
            }
        });
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
