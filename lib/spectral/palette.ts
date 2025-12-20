/**
 * The 6-paint limited palette for oil painting.
 * Colors are approximations - real paint would need measured reflectance data.
 */
import { Pigment } from './types';

/**
 * Limited palette of 6 oil paints.
 * Tinting strengths are set lower for powerful pigments like Phthalos.
 */
export const PALETTE: Pigment[] = [
    {
        id: 'titanium-white',
        name: 'Titanium White',
        hex: '#FDFDFD',
        tintingStrength: 1.0,
        isValueAdjuster: true,
    },
    {
        id: 'ivory-black',
        name: 'Ivory Black',
        hex: '#0B0B0B',
        tintingStrength: 0.8,
        isValueAdjuster: true,
    },
    {
        id: 'yellow-ochre',
        name: 'Yellow Ochre',
        hex: '#CC8E35',
        tintingStrength: 0.9,
    },
    {
        id: 'cadmium-red',
        name: 'Cadmium Red',
        hex: '#E52B21',
        tintingStrength: 0.85,
    },
    {
        id: 'phthalo-green',
        name: 'Phthalo Green',
        hex: '#123524',
        tintingStrength: 0.25, // Very strong, needs low tinting strength
    },
    {
        id: 'phthalo-blue',
        name: 'Phthalo Blue',
        hex: '#0F2E53',
        tintingStrength: 0.3, // Very strong, needs low tinting strength
    },
];

/**
 * Get a map of pigment ID to Pigment for quick lookup.
 */
export const PALETTE_MAP = new Map<string, Pigment>(
    PALETTE.map((p) => [p.id, p])
);

/**
 * Get value adjusters (white and black).
 */
export const VALUE_ADJUSTERS = PALETTE.filter((p) => p.isValueAdjuster);

/**
 * Get chromatic pigments (not white or black).
 */
export const CHROMATIC_PIGMENTS = PALETTE.filter((p) => !p.isValueAdjuster);
