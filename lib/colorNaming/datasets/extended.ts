import { ColorSource } from '../types';

/**
 * Lazy loads the extended color dataset.
 * In a real implementation, this would import a large JSON file.
 * For now, we stub it with a small set if needed, but the mechanism is ready.
 */
export async function loadExtendedColors(): Promise<Record<string, string>> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return a small representative set for now
    return {
        "#542c5d": "Grape",
        "#a45a52": "Redwood",
        "#e2e2e2": "Platinum",
        "#343434": "Jet",
        "#ffdab9": "Peach",
        "#98fb98": "Pale Green",
        "#87ceeb": "Sky Blue",
        "#f0e68c": "Khaki",
        "#dda0dd": "Plum",
        "#b0e0e6": "Powder Blue",
        // TODO: Add full 30k list here or import from a dedicated JSON file
    };
}
