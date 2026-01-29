/**
 * Tests for color conversion utilities
 */

import { describe, it, expect } from 'vitest';
import { rgbToHsb, hexToHsb, validateHex, validateRgb, hexToRgb } from './colorConversion';

describe('rgbToHsb', () => {
    it('converts pure red correctly', () => {
        const result = rgbToHsb(255, 0, 0);
        expect(result.h).toBeCloseTo(0, 2);
        expect(result.s).toBeCloseTo(1, 2);
        expect(result.b).toBeCloseTo(1, 2);
    });

    it('converts pure green correctly', () => {
        const result = rgbToHsb(0, 255, 0);
        expect(result.h).toBeCloseTo(0.333, 2);
        expect(result.s).toBeCloseTo(1, 2);
        expect(result.b).toBeCloseTo(1, 2);
    });

    it('converts pure blue correctly', () => {
        const result = rgbToHsb(0, 0, 255);
        expect(result.h).toBeCloseTo(0.666, 2);
        expect(result.s).toBeCloseTo(1, 2);
        expect(result.b).toBeCloseTo(1, 2);
    });

    it('converts black correctly', () => {
        const result = rgbToHsb(0, 0, 0);
        expect(result.h).toBe(0);
        expect(result.s).toBe(0);
        expect(result.b).toBe(0);
    });

    it('converts white correctly', () => {
        const result = rgbToHsb(255, 255, 255);
        expect(result.h).toBe(0);
        expect(result.s).toBe(0);
        expect(result.b).toBe(1);
    });

    it('converts gray correctly', () => {
        const result = rgbToHsb(128, 128, 128);
        expect(result.h).toBe(0);
        expect(result.s).toBe(0);
        expect(result.b).toBeCloseTo(0.502, 2);
    });

    it('converts orange correctly', () => {
        const result = rgbToHsb(255, 165, 0);
        expect(result.h).toBeCloseTo(0.108, 2); // ~39 degrees / 360
        expect(result.s).toBeCloseTo(1, 2);
        expect(result.b).toBeCloseTo(1, 2);
    });
});

describe('hexToHsb', () => {
    it('converts hex with # prefix', () => {
        const result = hexToHsb('#FF0000');
        expect(result.h).toBeCloseTo(0, 2);
        expect(result.s).toBeCloseTo(1, 2);
        expect(result.b).toBeCloseTo(1, 2);
    });

    it('converts hex without # prefix', () => {
        const result = hexToHsb('00FF00');
        expect(result.h).toBeCloseTo(0.333, 2);
        expect(result.s).toBeCloseTo(1, 2);
        expect(result.b).toBeCloseTo(1, 2);
    });

    it('converts lowercase hex', () => {
        const result = hexToHsb('#0000ff');
        expect(result.h).toBeCloseTo(0.666, 2);
        expect(result.s).toBeCloseTo(1, 2);
        expect(result.b).toBeCloseTo(1, 2);
    });
});

describe('validateHex', () => {
    it('validates 6-char hex with #', () => {
        expect(validateHex('#FF5733')).toBe('#FF5733');
    });

    it('validates 6-char hex without #', () => {
        expect(validateHex('FF5733')).toBe('#FF5733');
    });

    it('expands 3-char hex', () => {
        expect(validateHex('#F53')).toBe('#FF5533');
    });

    it('rejects invalid hex', () => {
        expect(validateHex('#GGGGGG')).toBeNull();
        expect(validateHex('XYZ')).toBeNull();
        expect(validateHex('#12')).toBeNull();
    });

    it('handles lowercase', () => {
        expect(validateHex('#ff5733')).toBe('#ff5733');
    });
});

describe('validateRgb', () => {
    it('validates valid RGB', () => {
        expect(validateRgb(255, 0, 0)).toBe(true);
        expect(validateRgb(0, 255, 0)).toBe(true);
        expect(validateRgb(128, 128, 128)).toBe(true);
    });

    it('rejects out-of-range values', () => {
        expect(validateRgb(256, 0, 0)).toBe(false);
        expect(validateRgb(-1, 0, 0)).toBe(false);
        expect(validateRgb(0, 300, 0)).toBe(false);
    });

    it('rejects non-integers', () => {
        expect(validateRgb(255.5, 0, 0)).toBe(false);
        expect(validateRgb(128.2, 128, 128)).toBe(false);
    });
});

describe('hexToRgb', () => {
    it('converts valid hex to RGB', () => {
        expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
        expect(hexToRgb('#00FF00')).toEqual([0, 255, 0]);
        expect(hexToRgb('#0000FF')).toEqual([0, 0, 255]);
    });

    it('handles 3-char hex', () => {
        expect(hexToRgb('#F00')).toEqual([255, 0, 0]);
    });

    it('returns null for invalid hex', () => {
        expect(hexToRgb('#GGGGGG')).toBeNull();
        expect(hexToRgb('invalid')).toBeNull();
    });
});
