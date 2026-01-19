import { ColorSource } from '../types';

/**
 * Lazy loads the extended color dataset from the public colornames.json.
 */
export async function loadExtendedColors(): Promise<Record<string, string>> {
    try {
        const response = await fetch('/colornames.json');
        if (!response.ok) throw new Error('Failed to load color names');

        const data: Array<{ name: string; hex: string }> = await response.json();

        // Convert to Record<hex, name> for faster lookup
        const colors: Record<string, string> = {};
        for (const entry of data) {
            colors[entry.hex.toLowerCase()] = entry.name;
        }

        return colors;
    } catch (error) {
        console.error('Error loading extended colors:', error);
        return {}; // Return empty or fallback
    }
}
