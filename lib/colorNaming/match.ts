import { deltaE } from '../colorUtils';
import { ColorNameMatch, ColorSource } from './types';

/**
 * Finds the nearest color name from a given dataset using Delta E distance.
 */
export function findNearestColor(
    targetHex: string,
    dataset: Record<string, string>,
    source: ColorSource
): ColorNameMatch {
    let minDistance = Infinity;
    let bestMatch: ColorNameMatch = {
        name: "Unknown",
        matchedHex: targetHex,
        distance: 100,
        source
    };

    for (const [hex, name] of Object.entries(dataset)) {
        const distance = deltaE(targetHex, hex);

        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = {
                name,
                matchedHex: hex,
                distance,
                source
            };
        }

        // Perfection found, stop early
        if (distance === 0) break;
    }

    return bestMatch;
}
