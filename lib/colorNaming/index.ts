import { cssColors } from './datasets/css';
import { xkcdColors } from './datasets/xkcd';
import { loadExtendedColors } from './datasets/extended';
import { findNearestColor } from './match';
import { getCachedMatch, setCachedMatch } from './cache';
import { ColorNameMatch, ColorSource, GetColorNameOptions } from './types';

let extendedColorsCache: Record<string, string> | null = null;

/**
 * Main entry point for getting a color name.
 * Handles tiered dataset selection and lazy loading for the extended dataset.
 */
export async function getColorName(
    hex: string,
    options: GetColorNameOptions = {}
): Promise<ColorNameMatch> {
    const source = options.source || 'css';

    // 1. Check Cache
    const cached = getCachedMatch(hex, source);
    if (cached) return cached;

    // 2. Select Dataset
    let dataset: Record<string, string>;

    switch (source) {
        case 'xkcd':
            dataset = xkcdColors;
            break;
        case 'extended':
            if (!extendedColorsCache) {
                extendedColorsCache = await loadExtendedColors();
            }
            dataset = extendedColorsCache;
            break;
        case 'css':
        default:
            dataset = cssColors;
            break;
    }

    // 3. Match
    const match = findNearestColor(hex, dataset, source);

    // 4. Cache and Return
    setCachedMatch(hex, source, match);
    return match;
}
