/**
 * Tests for the paint catalog system.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    getCatalog,
    reloadCatalog,
    getBrands,
    getPaints,
    getPaint,
    searchPaints,
    paintToPigment,
} from './catalog';

describe('PaintCatalog', () => {
    beforeEach(async () => {
        // Ensure fresh catalog for each test
        await reloadCatalog();
    });

    describe('getCatalog', () => {
        it('should load the catalog with brands and paints', async () => {
            const catalog = await getCatalog();

            expect(catalog.brands.length).toBeGreaterThan(0);
            expect(catalog.paints.length).toBeGreaterThan(0);
        });

        it('should cache the catalog on subsequent calls', async () => {
            const catalog1 = await getCatalog();
            const catalog2 = await getCatalog();

            expect(catalog1).toBe(catalog2);
        });
    });

    describe('getBrands', () => {
        it('should return Winsor & Newton brand', async () => {
            const brands = await getBrands();
            const wn = brands.find(b => b.id === 'winsor-newton');

            expect(wn).toBeDefined();
            expect(wn?.name).toBe('Winsor & Newton');
            expect(wn?.lines.length).toBeGreaterThan(0);
        });
    });

    describe('getPaints', () => {
        it('should return all paints when no filter', async () => {
            const paints = await getPaints();

            expect(paints.length).toBeGreaterThan(20);
        });

        it('should filter by brandId', async () => {
            const paints = await getPaints({ brandId: 'winsor-newton' });

            expect(paints.length).toBeGreaterThan(0);
            expect(paints.every(p => p.brandId === 'winsor-newton')).toBe(true);
        });

        it('should filter by lineId', async () => {
            const paints = await getPaints({
                brandId: 'winsor-newton',
                lineId: 'winton'
            });

            expect(paints.length).toBeGreaterThan(0);
            expect(paints.every(p => p.lineId === 'winton')).toBe(true);
        });

        it('should filter by opacity', async () => {
            const opaques = await getPaints({ opacity: 'opaque' });
            const transparents = await getPaints({ opacity: 'transparent' });

            expect(opaques.length).toBeGreaterThan(0);
            expect(transparents.length).toBeGreaterThan(0);
            expect(opaques.every(p => p.opacity === 'opaque')).toBe(true);
            expect(transparents.every(p => p.opacity === 'transparent')).toBe(true);
        });

        it('should filter by minimum permanence', async () => {
            const permanent = await getPaints({ minPermanence: 'permanent' });

            expect(permanent.length).toBeGreaterThan(0);
            expect(permanent.every(p =>
                p.permanence === 'permanent' || p.permanence === 'extremely-permanent'
            )).toBe(true);
        });

        it('should filter by pigment code', async () => {
            const pw6 = await getPaints({ pigmentCode: 'PW6' });

            expect(pw6.length).toBeGreaterThan(0);
            expect(pw6.every(p => p.pigmentCodes.includes('PW6'))).toBe(true);
        });
    });

    describe('getPaint', () => {
        it('should get a specific paint by full ID', async () => {
            const paint = await getPaint('winsor-newton/winton/titanium-white');

            expect(paint).toBeDefined();
            expect(paint?.name).toBe('Titanium White');
            expect(paint?.pigmentCodes).toContain('PW6');
        });

        it('should return undefined for unknown paint', async () => {
            const paint = await getPaint('fake-brand/fake-line/fake-paint');

            expect(paint).toBeUndefined();
        });
    });

    describe('searchPaints', () => {
        it('should search by name', async () => {
            const results = await searchPaints('titanium');

            expect(results.length).toBeGreaterThan(0);
            expect(results.some(p => p.name.toLowerCase().includes('titanium'))).toBe(true);
        });

        it('should search by pigment code', async () => {
            const results = await searchPaints('PB15');

            expect(results.length).toBeGreaterThan(0);
            // All results should contain PB15 (or variant like PB15:3) in their pigment codes
            expect(results.every(p =>
                p.pigmentCodes.some(code => code.includes('PB15'))
            )).toBe(true);
        });

        it('should be case-insensitive', async () => {
            const results1 = await searchPaints('PHTHALO');
            const results2 = await searchPaints('phthalo');

            expect(results1.length).toBe(results2.length);
        });
    });

    describe('paintToPigment', () => {
        it('should convert paint to legacy pigment format', async () => {
            const paint = await getPaint('winsor-newton/winton/titanium-white');
            const pigment = paintToPigment(paint!);

            expect(pigment.id).toBe('winsor-newton/winton/titanium-white');
            expect(pigment.name).toBe('Titanium White');
            expect(pigment.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(pigment.tintingStrength).toBe(1.0);
            expect(pigment.isValueAdjuster).toBe(true);
        });

        it('should identify value adjusters correctly', async () => {
            const titanium = await getPaint('winsor-newton/winton/titanium-white');
            const ivory = await getPaint('winsor-newton/winton/ivory-black');
            const phthalo = await getPaint('winsor-newton/winton/phthalo-blue');

            expect(paintToPigment(titanium!).isValueAdjuster).toBe(true);
            expect(paintToPigment(ivory!).isValueAdjuster).toBe(true);
            expect(paintToPigment(phthalo!).isValueAdjuster).toBe(false);
        });
    });
});
