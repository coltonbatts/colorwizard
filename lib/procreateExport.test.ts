/**
 * Tests for Procreate export functionality
 */

import { describe, it, expect } from 'vitest';
import { generateSwatchesJson, MAX_PROCREATE_COLORS, DEFAULT_PALETTE_NAME } from './procreateExport';
import type { ProcreateColor } from './types/procreate';

describe('generateSwatchesJson', () => {
    it('generates valid swatches structure', () => {
        const colors: ProcreateColor[] = [
            { hex: '#FF0000', name: 'Red' },
            { hex: '#00FF00', name: 'Green' },
            { hex: '#0000FF', name: 'Blue' },
        ];

        const result = generateSwatchesJson(colors);

        expect(result.name).toBe(DEFAULT_PALETTE_NAME);
        expect(result.swatches).toHaveLength(MAX_PROCREATE_COLORS);
        expect(result.swatches[0]).toMatchObject({
            hue: expect.any(Number),
            saturation: expect.any(Number),
            brightness: expect.any(Number),
            alpha: 1,
            colorSpace: 0,
        });
    });

    it('uses custom palette name', () => {
        const colors: ProcreateColor[] = [{ hex: '#FF0000' }];
        const result = generateSwatchesJson(colors, { paletteName: 'My Custom Palette' });

        expect(result.name).toBe('My Custom Palette');
    });

    it('pads with null to 30 swatches', () => {
        const colors: ProcreateColor[] = [
            { hex: '#FF0000' },
            { hex: '#00FF00' },
        ];

        const result = generateSwatchesJson(colors);

        expect(result.swatches).toHaveLength(30);
        expect(result.swatches[0]).not.toBeNull();
        expect(result.swatches[1]).not.toBeNull();
        expect(result.swatches[2]).toBeNull();
    });

    it('limits to maxColors', () => {
        const colors: ProcreateColor[] = Array.from({ length: 10 }, (_, i) => ({
            hex: `#${i.toString(16).padStart(6, '0')}`,
        }));

        const result = generateSwatchesJson(colors, { maxColors: 5 });

        // First 5 should be valid swatches, rest should be null
        expect(result.swatches[0]).not.toBeNull();
        expect(result.swatches[4]).not.toBeNull();
        expect(result.swatches[5]).toBeNull();
    });

    it('sorts by brightness when sortByValue is true', () => {
        const colors: ProcreateColor[] = [
            { hex: '#000000', name: 'Black' },
            { hex: '#FFFFFF', name: 'White' },
            { hex: '#808080', name: 'Gray' },
        ];

        const result = generateSwatchesJson(colors, { sortByValue: true });

        // White should be first (highest brightness)
        expect(result.swatches[0]?.brightness).toBeCloseTo(1, 2);
        // Black should be last (lowest brightness)
        expect(result.swatches[2]?.brightness).toBeCloseTo(0, 2);
    });

    it('handles RGB input', () => {
        const colors: ProcreateColor[] = [
            { rgb: [255, 0, 0], name: 'Red' },
        ];

        const result = generateSwatchesJson(colors);

        expect(result.swatches[0]).toMatchObject({
            hue: expect.any(Number),
            saturation: 1,
            brightness: 1,
            alpha: 1,
            colorSpace: 0,
        });
    });

    it('filters out invalid colors', () => {
        const colors: ProcreateColor[] = [
            { hex: '#FF0000', name: 'Valid' },
            { hex: 'invalid', name: 'Invalid' },
            { hex: '#00FF00', name: 'Valid' },
        ];

        const result = generateSwatchesJson(colors);

        // Should have 2 valid swatches, rest null
        expect(result.swatches[0]).not.toBeNull();
        expect(result.swatches[1]).not.toBeNull();
        expect(result.swatches[2]).toBeNull();
    });

    it('handles empty color array', () => {
        const result = generateSwatchesJson([]);

        expect(result.swatches).toHaveLength(30);
        expect(result.swatches.every(s => s === null)).toBe(true);
    });

    it('converts pure colors correctly', () => {
        const colors: ProcreateColor[] = [
            { hex: '#FF0000', name: 'Red' },
            { hex: '#00FF00', name: 'Green' },
            { hex: '#0000FF', name: 'Blue' },
        ];

        const result = generateSwatchesJson(colors);

        // Red: hue ~0
        expect(result.swatches[0]?.hue).toBeCloseTo(0, 1);
        // Green: hue ~0.33
        expect(result.swatches[1]?.hue).toBeCloseTo(0.333, 1);
        // Blue: hue ~0.66
        expect(result.swatches[2]?.hue).toBeCloseTo(0.666, 1);
    });
});
