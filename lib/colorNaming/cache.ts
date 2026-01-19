import { ColorNameMatch, ColorSource } from './types';

const cache = new Map<string, ColorNameMatch>();

/**
 * Generates a cache key based on hex and source.
 */
function getCacheKey(hex: string, source: ColorSource): string {
    return `${hex.toLowerCase()}:${source}`;
}

/**
 * Retrieves a cached color name match.
 */
export function getCachedMatch(hex: string, source: ColorSource): ColorNameMatch | undefined {
    return cache.get(getCacheKey(hex, source));
}

/**
 * Stores a color name match in the cache.
 */
export function setCachedMatch(hex: string, source: ColorSource, match: ColorNameMatch): void {
    cache.set(getCacheKey(hex, source), match);

    // Basic LRU-like limit to prevent memory bloat (though color names are small)
    if (cache.size > 1000) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
    }
}
