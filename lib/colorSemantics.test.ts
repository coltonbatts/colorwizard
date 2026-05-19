import { describe, expect, it } from 'vitest';
import {
    formatCatalogDeltaE00,
    formatSpectralModelError,
    getCatalogMatchPresentation,
    getSpectralModelFitPresentation,
} from './colorSemantics';

describe('colorSemantics', () => {
    it('formats catalog CIEDE2000 separately from spectral model error', () => {
        expect(formatCatalogDeltaE00(2.34)).toBe('ΔE₀₀ 2.3');
        expect(formatSpectralModelError(2.34)).toBe('model Δ 2.3');
        expect(formatCatalogDeltaE00(2.34)).not.toContain('model');
        expect(formatSpectralModelError(2.34)).not.toContain('ΔE₀₀');
    });

    it('maps spectral model error to model-fit labels', () => {
        expect(getSpectralModelFitPresentation(0.5).label).toBe('Strong model fit');
        expect(getSpectralModelFitPresentation(8).label).toBe('Weak model fit');
    });

    it('maps catalog distance to CIEDE2000 confidence labels', () => {
        expect(getCatalogMatchPresentation(0.5).label).toBe('Exact Match');
        expect(getCatalogMatchPresentation(0.5).metricLabel).toBe('ΔE₀₀ 0.5');
    });
});
