import { describe, expect, it } from 'vitest';
import { rgbToHex } from './conversions';

describe('color conversions', () => {
    describe('rgbToHex', () => {
        it('converts RGB channels to hex', () => {
            expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
            expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
            expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
        });

        it('rounds fractional channels before formatting', () => {
            expect(rgbToHex(12.4, 127.5, 254.6)).toBe('#0c80ff');
        });

        it('clamps out-of-range channels', () => {
            expect(rgbToHex(300, -20, 128)).toBe('#ff0080');
        });

        it('treats non-finite channels as 0', () => {
            expect(rgbToHex(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)).toBe('#000000');
        });
    });
});
