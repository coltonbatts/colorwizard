
import { describe, it, expect } from 'vitest';
import { solveRecipe } from './solveRecipe';

describe('solveRecipe pigment accuracy', () => {
    it('should use a white-led pile for a light blue color', async () => {
        // Sky Blue hex
        const targetHex = '#87CEEB';
        const recipe = await solveRecipe(targetHex);

        expect(recipe.ingredients.length).toBeGreaterThan(0);
        expect(recipe.steps[0]).toContain('Titanium White');

        // Phthalo Blue should be present but in a small amount (e.g. < 20%)
        const phthaloBlue = recipe.ingredients.find(i => i.pigment.id === 'phthalo-blue');
        expect(phthaloBlue).toBeDefined();
        expect(phthaloBlue!.weight).toBeLessThan(0.2);
    });

    it('should use Yellow Ochre as the base pile for Olive Green, not a phthalo', async () => {
        // Olive Green hex
        const targetHex = '#808000';
        const recipe = await solveRecipe(targetHex);

        expect(recipe.steps[0]).toContain('Yellow Ochre');
        expect(recipe.steps[0].toLowerCase()).not.toContain('phthalo');
    });

    it('should use Ivory Black as a value correction for dark colors, not the starting pile', async () => {
        // Dark Navy
        const targetHex = '#000033';
        const recipe = await solveRecipe(targetHex);

        const hasBlack = recipe.ingredients.some(i => i.pigment.id === 'ivory-black');
        expect(hasBlack).toBe(true);
        expect(recipe.steps[0]).not.toContain('Ivory Black');
        expect(recipe.steps.some(step => step.includes('Ivory Black') && step.includes('lock the value'))).toBe(true);
    });

    it('should NOT ignore green for #57655c', async () => {
        const targetHex = '#57655c';
        const recipe = await solveRecipe(targetHex);

        console.log('Recipe for #57655c:', recipe.ingredients.map(i => `${i.pigment.name}: ${i.percentage}`).join(', '));
        console.log('Error:', recipe.error);

        // Should include green or blue to hit that hue
        const hasHue = recipe.ingredients.some(i =>
            ['phthalo-green', 'phthalo-blue', 'yellow-ochre'].includes(i.pigment.id)
        );
        expect(hasHue).toBe(true);
    });

    it('supports catalog paint IDs without falling back through the legacy palette map', async () => {
        const targetHex = '#87CEEB';
        const recipe = await solveRecipe(targetHex, {
            useCatalog: true,
            paintIds: [
                'winsor-newton/winton/titanium-white',
                'winsor-newton/winton/phthalo-blue',
            ],
        });

        expect(recipe.ingredients.length).toBeGreaterThan(0);
        expect(recipe.ingredients[0].pigment.id).toBe('winsor-newton/winton/titanium-white');
        expect(recipe.ingredients.some((ingredient) => ingredient.pigment.id === 'winsor-newton/winton/phthalo-blue')).toBe(true);
    });

    it('keeps value work ahead of hue work in the generated steps', async () => {
        const recipe = await solveRecipe('#87CEEB');

        const valueStepIdx = recipe.steps.findIndex(step => step.includes('Build the value pile') || step.includes('Lock the value'))
        const hueStepIdx = recipe.steps.findIndex(
            step => step.includes('Adjust temperature') || step.includes('Nudge the hue') || step.includes('strong tinter last')
        )

        expect(valueStepIdx).toBeGreaterThanOrEqual(0);
        expect(hueStepIdx).toBeGreaterThanOrEqual(0);
        expect(valueStepIdx).toBeLessThan(hueStepIdx);
    });

    it('warns when a phthalo enters the mix', async () => {
        const recipe = await solveRecipe('#87CEEB');

        expect(recipe.steps.some(step => step.includes('strong tinter last') && step.includes('Phthalo Blue'))).toBe(true);
        expect(recipe.steps.some(step => step.includes('Tip:') && step.includes('Phthalo Blue'))).toBe(true);
    });

    it('stays on the six-color default palette and does not pull in Raw Umber', async () => {
        const recipe = await solveRecipe('#6b4a2f');

        expect(recipe.ingredients.some((ingredient) => ingredient.pigment.id === 'raw-umber')).toBe(false);
    });
});
