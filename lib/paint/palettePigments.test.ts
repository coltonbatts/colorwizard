import { describe, expect, it } from 'vitest';
import type { Palette } from '../types/palette';
import { usePaletteStore } from '../store/usePaletteStore';
import { DEFAULT_PALETTE } from '../types/palette';
import { getPaletteSolveOptions, makeCustomTube, resolvePalettePigments } from './palettePigments';
import { solveRecipe } from './solveRecipe';
import { generatePaintRecipe } from '../colorMixer';
import { mixPigmentsSync } from '../spectral/adapter';

const white = { id: 'titanium-white', displayName: 'Titanium White' };
const black = { id: 'ivory-black', displayName: 'Ivory Black' };

describe('custom tubes', () => {
    it('validates the hex, clamps the strength and never collides with library ids', () => {
        expect(makeCustomTube('Blue', 'blue')).toBeNull();
        expect(makeCustomTube('  ', '#112233')).toBeNull();
        const tube = makeCustomTube('My Ultramarine', '#1f3f9a', 500)!;
        expect(tube.hex).toBe('#1F3F9A');
        expect(tube.tintingStrength).toBe(20);
        expect(tube.id.startsWith('custom-')).toBe(true);
    });

    it('resolves library colors and custom tubes, dropping unknowns and duplicates', () => {
        const tube = makeCustomTube('Warm White', '#F5EFE0')!;
        const pigments = resolvePalettePigments([white, white, tube, { id: 'nope', displayName: 'Nope' }]);
        expect(pigments.map((p) => p.id)).toEqual(['titanium-white', tube.id]);
        expect(pigments[1].isValueAdjuster).toBe(true);
    });

    it('leaves the default palette on the Core 6 and uses id filtering when there are no custom tubes', () => {
        expect(getPaletteSolveOptions(DEFAULT_PALETTE)).toBeUndefined();
        expect(getPaletteSolveOptions({ isDefault: false, colors: [white, black] })).toEqual({ paletteColorIds: ['titanium-white', 'ivory-black'] });
        const tube = makeCustomTube('Cobalt', '#0047AB', 2)!;
        expect(getPaletteSolveOptions({ isDefault: false, colors: [white, tube] })?.pigments).toHaveLength(2);
    });
});

describe('solver honors the user palette', () => {
    const cobalt = makeCustomTube('Cobalt', '#0047AB', 2)!;
    const palette = [white, black, cobalt];

    it('only uses tubes in the palette, including a custom one', async () => {
        const options = getPaletteSolveOptions({ isDefault: false, colors: palette });
        await solveRecipe('#5A8FB8', options); // registers the custom tube
        const reachable = mixPigmentsSync([{ pigmentId: 'titanium-white', weight: 3 }, { pigmentId: cobalt.id, weight: 1 }]).hex;
        const recipe = await solveRecipe(reachable, options);
        const allowed = new Set(palette.map((c) => c.id));
        expect(recipe.ingredients.length).toBeGreaterThan(0);
        expect(recipe.ingredients.every((i) => allowed.has(i.pigment.id))).toBe(true);
        expect(recipe.ingredients.some((i) => i.pigment.id === cobalt.id)).toBe(true);
        expect(recipe.matchQuality).toBe('Excellent');
    });

    it('uses the tube strength: a stronger blue needs less of it for the same sky', async () => {
        const weak = makeCustomTube('Blue', '#0047AB', 0.5)!;
        const strong = { ...weak, tintingStrength: 4 };
        const opts = (tube: typeof weak) => getPaletteSolveOptions({ isDefault: false, colors: [white, tube] });
        const a = await solveRecipe('#87CEEB', opts(weak));
        const b = await solveRecipe('#87CEEB', opts(strong));
        const share = (r: typeof a, id: string) => r.ingredients.find((i) => i.pigment.id === id)!.weight;
        expect(share(b, weak.id)).toBeLessThan(share(a, weak.id));
    });

    it('says so when the palette cannot reach the color instead of pretending', async () => {
        const recipe = await solveRecipe('#FF00FF', getPaletteSolveOptions({ isDefault: false, colors: [white, black] }));
        expect(recipe.matchQuality).toBe('Poor');
    });

    it('leaves the Core 6 default, and the heuristic engine, untouched', async () => {
        const core = await solveRecipe('#87CEEB');
        expect(core.ingredients.every((i) => i.pigment.id !== 'raw-umber')).toBe(true);
        expect(generatePaintRecipe({ h: 200, s: 60, l: 70 }).colors.length).toBeGreaterThan(0);
    });
});

describe('palette store', () => {
    const base: Palette = { id: 'mine', name: 'Mine', colors: [white], isActive: false, isDefault: false, createdAt: 1 };

    it('adds and removes tubes without touching the default palette or duplicating', () => {
        usePaletteStore.setState({ palettes: [DEFAULT_PALETTE, base] });
        const tube = makeCustomTube('Cobalt', '#0047AB')!;
        const { addColorToPalette, removeColorFromPalette } = usePaletteStore.getState();
        addColorToPalette('mine', tube);
        addColorToPalette('mine', tube);
        addColorToPalette('default', tube);
        let { palettes } = usePaletteStore.getState();
        expect(palettes.find((p) => p.id === 'mine')!.colors.map((c) => c.id)).toEqual(['titanium-white', tube.id]);
        expect(palettes.find((p) => p.id === 'default')!.colors).toHaveLength(6);
        removeColorFromPalette('mine', tube.id);
        palettes = usePaletteStore.getState().palettes;
        expect(palettes.find((p) => p.id === 'mine')!.colors.map((c) => c.id)).toEqual(['titanium-white']);
    });
});
