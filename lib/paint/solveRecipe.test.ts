
import { describe, it, expect } from 'vitest';
import { solveRecipe } from './solveRecipe';

describe('solveRecipe pigment accuracy', () => {
    it('should lead with Titanium White for a light blue color', async () => {
        // Sky Blue hex
        const targetHex = '#87CEEB';
        const recipe = await solveRecipe(targetHex);

        expect(recipe.ingredients.length).toBeGreaterThan(0);
        // Titanium White should be the base (highest weight)
        expect(recipe.ingredients[0].pigment.id).toBe('titanium-white');

        // Phthalo Blue should be present but in a small amount (e.g. < 20%)
        const phthaloBlue = recipe.ingredients.find(i => i.pigment.id === 'phthalo-blue');
        expect(phthaloBlue).toBeDefined();
        expect(phthaloBlue!.weight).toBeLessThan(0.2);
    });

    it('should use Yellow Ochre or White as base for Olive Green, not Phthalo Green', async () => {
        // Olive Green hex
        const targetHex = '#808000';
        const recipe = await solveRecipe(targetHex);

        expect(recipe.ingredients[0].pigment.id).not.toBe('phthalo-green');
        expect(recipe.ingredients[0].pigment.id).not.toBe('phthalo-blue');
    });

    it('should use Ivory Black to darken colors significantly', async () => {
        // Dark Navy
        const targetHex = '#000033';
        const recipe = await solveRecipe(targetHex);

        const hasBlack = recipe.ingredients.some(i => i.pigment.id === 'ivory-black');
        expect(hasBlack).toBe(true);
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
});
