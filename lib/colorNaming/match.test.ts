import { describe, it, expect } from 'vitest';
import { findNearestColor } from './match';

describe('findNearestColor', () => {
    const dataset = {
        "#ff0000": "Red",
        "#00ff00": "Green",
        "#0000ff": "Blue",
        "#ffffff": "White",
        "#000000": "Black"
    };

    it('should find exact matches', () => {
        const match = findNearestColor("#ff0000", dataset, 'extended');
        expect(match.name).toBe("Red");
        expect(match.distance).toBe(0);
    });

    it('should find nearby colors', () => {
        const match = findNearestColor("#fe0000", dataset, 'extended');
        expect(match.name).toBe("Red");
        expect(match.distance).toBeLessThan(1);
    });

    it('should handle cases with many colors in the dataset', () => {
        // Create a larger dataset
        const largeDataset: Record<string, string> = { ...dataset };
        for (let i = 0; i < 1000; i++) {
            const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            largeDataset[hex] = `Color ${i}`;
        }

        const start = performance.now();
        const match = findNearestColor("#abcdef", largeDataset, 'extended');
        const end = performance.now();

        console.log(`Matching took ${end - start}ms for 1000 colors`);
        expect(match.name).toBeDefined();
        expect(end - start).toBeLessThan(100); // Should be very fast for 1000
    });
});
