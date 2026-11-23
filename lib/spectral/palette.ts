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
        tintingStrength: 1.0, // Baseline
        isValueAdjuster: true,
    },
    {
        id: 'ivory-black',
        name: 'Ivory Black',
        hex: '#0B0B0B',
        tintingStrength: 5.0, // Strong
        isValueAdjuster: true,
    },
    {
        id: 'yellow-ochre',
        name: 'Yellow Ochre',
        hex: '#CC8E35',
        tintingStrength: 0.9, // Earth color, slightly weaker
    },
    {
        id: 'cadmium-red',
        name: 'Cadmium Red',
        hex: '#E52B21',
        tintingStrength: 1.5, // Decent strength
    },
    {
        id: 'phthalo-green',
        name: 'Phthalo Green',
        hex: '#123524',
        tintingStrength: 8.0, // Very strong
    },
    {
        id: 'phthalo-blue',
        name: 'Phthalo Blue',
        hex: '#0F2E53',
        tintingStrength: 10.0, // Extremely strong
    },
    {
        id: 'raw-umber',
        name: 'Raw Umber',
        // As it looks squeezed out (was #735C44, a light grayish tint that could not make darks; 2026-11-23)
        hex: '#45392B',
        tintingStrength: 1.2, // Earth color, standard
    },
];

/**
 * Warm earth tubes a painter can add in the web app's "Your paints". Same conventions and the same
 * caveat as PALETTE: hex is the tube as it looks squeezed out, tinting strength is hand-set, and
 * neither is measured from real paint. They are kept out of PALETTE because the desktop MixLab draws
 * a slider for every PALETTE pigment.
 *
 * Why (2026-11-23): the Core six cannot mix a dark, warm, yellow-leaning brown. Darkening with Ivory
 * Black kills the color and Cadmium Red turns it maroon. On the owner's reference (a dark ground,
 * L* 10, C* 8.3), the best Core six mix reached C* 4.1; adding either tube took the 12-pile plan
 * from 26% visibly off to 3%.
 */
export const EARTH_TUBES: Pigment[] = [
    {
        id: 'burnt-sienna',
        name: 'Burnt Sienna',
        hex: '#6E2E1C',
        tintingStrength: 1.2,
    },
    {
        id: 'burnt-umber',
        name: 'Burnt Umber',
        hex: '#45301F',
        tintingStrength: 1.5,
    },
];

/**
 * Get a map of pigment ID to Pigment for quick lookup.
 */
export const PALETTE_MAP = new Map<string, Pigment>(
    [...PALETTE, ...EARTH_TUBES].map((p) => [p.id, p])
);

/**
 * Get value adjusters (white and black).
 */
export const VALUE_ADJUSTERS = PALETTE.filter((p) => p.isValueAdjuster);

/**
 * Get chromatic pigments (not white or black).
 */
export const CHROMATIC_PIGMENTS = PALETTE.filter((p) => !p.isValueAdjuster);

/**
 * The default "Core six" the solver uses when no palette is given, in this order (the
 * benchmarks iterate it, so the order is part of their reproducibility).
 */
export const CORE_SIX_PIGMENT_IDS = [
    'titanium-white',
    'ivory-black',
    'yellow-ochre',
    'cadmium-red',
    'phthalo-blue',
    'phthalo-green',
] as const;
