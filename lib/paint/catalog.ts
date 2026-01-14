/**
 * Paint Catalog - loads and queries paint data from JSON files.
 * Supports multiple brands and lines with search/filter capabilities.
 */
import type {
    Paint,
    PaintBrand,
    PaintLine,
    PaintDataFile,
    PaintCatalogData,
    PaintSearchOptions,
    Opacity,
    Permanence
} from './types/Paint';

// ============================================================================
// Catalog Singleton
// ============================================================================

let catalogData: PaintCatalogData | null = null;
let loadPromise: Promise<PaintCatalogData> | null = null;

/**
 * Permanence hierarchy for filtering (higher index = more permanent).
 */
const PERMANENCE_ORDER: Permanence[] = [
    'fugitive',
    'moderately-durable',
    'permanent',
    'extremely-permanent',
];

/**
 * Get the loaded paint catalog, or load it if not yet loaded.
 */
export async function getCatalog(): Promise<PaintCatalogData> {
    if (catalogData) return catalogData;
    if (loadPromise) return loadPromise;

    loadPromise = loadAllPaints();
    catalogData = await loadPromise;
    return catalogData;
}

/**
 * Force reload the catalog (useful for hot reloading in dev).
 */
export async function reloadCatalog(): Promise<PaintCatalogData> {
    catalogData = null;
    loadPromise = null;
    return getCatalog();
}

// ============================================================================
// Data Loading
// ============================================================================

/**
 * Known paint data files to load.
 * Add new files here as they're created.
 */
const PAINT_DATA_FILES = [
    () => import('@/data/paints/winsor-newton/winton.json'),
    // Add more as needed:
    // () => import('@/data/paints/gamblin/artists-oil.json'),
    // () => import('@/data/paints/old-holland/classic.json'),
];

/**
 * Load all paint data files and merge into a single catalog.
 */
async function loadAllPaints(): Promise<PaintCatalogData> {
    const brands: Map<string, PaintBrand> = new Map();
    const paints: Paint[] = [];

    for (const importFn of PAINT_DATA_FILES) {
        try {
            const module = await importFn();
            const data = module.default as PaintDataFile;

            // Merge brand (may already exist from another line)
            if (!brands.has(data.brand.id)) {
                brands.set(data.brand.id, { ...data.brand, lines: [] });
            }

            // Add line to brand if not already present
            const brand = brands.get(data.brand.id)!;
            if (!brand.lines.find(l => l.id === data.line.id)) {
                brand.lines.push(data.line);
            }

            // Process and add paints
            for (const paintData of data.paints) {
                const paint: Paint = {
                    id: `${data.brand.id}/${data.line.id}/${paintData.slug}`,
                    brandId: data.brand.id,
                    lineId: data.line.id,
                    ...paintData,
                };
                paints.push(paint);
            }
        } catch (error) {
            console.error('Failed to load paint data:', error);
        }
    }

    return {
        brands: Array.from(brands.values()),
        paints,
    };
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all loaded brands.
 */
export async function getBrands(): Promise<PaintBrand[]> {
    const catalog = await getCatalog();
    return catalog.brands;
}

/**
 * Get a specific brand by ID.
 */
export async function getBrand(brandId: string): Promise<PaintBrand | undefined> {
    const catalog = await getCatalog();
    return catalog.brands.find(b => b.id === brandId);
}

/**
 * Get all lines for a brand.
 */
export async function getLines(brandId: string): Promise<PaintLine[]> {
    const brand = await getBrand(brandId);
    return brand?.lines ?? [];
}

/**
 * Get all paints (optionally filtered).
 */
export async function getPaints(options?: PaintSearchOptions): Promise<Paint[]> {
    const catalog = await getCatalog();
    let results = catalog.paints;

    if (options) {
        results = filterPaints(results, options);
    }

    return results;
}

/**
 * Get a specific paint by its full ID.
 */
export async function getPaint(id: string): Promise<Paint | undefined> {
    const catalog = await getCatalog();
    return catalog.paints.find(p => p.id === id);
}

/**
 * Get a paint by brand, line, and slug.
 */
export async function getPaintBySlug(
    brandId: string,
    lineId: string,
    slug: string
): Promise<Paint | undefined> {
    return getPaint(`${brandId}/${lineId}/${slug}`);
}

/**
 * Search paints by name or pigment code.
 */
export async function searchPaints(query: string): Promise<Paint[]> {
    return getPaints({ query });
}

// ============================================================================
// Filtering
// ============================================================================

/**
 * Filter paints based on search options.
 */
function filterPaints(paints: Paint[], options: PaintSearchOptions): Paint[] {
    return paints.filter(paint => {
        // Brand filter
        if (options.brandId && paint.brandId !== options.brandId) {
            return false;
        }

        // Line filter
        if (options.lineId && paint.lineId !== options.lineId) {
            return false;
        }

        // Opacity filter
        if (options.opacity) {
            const opacities = Array.isArray(options.opacity) ? options.opacity : [options.opacity];
            if (!opacities.includes(paint.opacity)) {
                return false;
            }
        }

        // Permanence filter (must be at least this permanent)
        if (options.minPermanence) {
            const minIndex = PERMANENCE_ORDER.indexOf(options.minPermanence);
            const paintIndex = PERMANENCE_ORDER.indexOf(paint.permanence);
            if (paintIndex < minIndex) {
                return false;
            }
        }

        // Pigment code filter
        if (options.pigmentCode) {
            if (!paint.pigmentCodes.includes(options.pigmentCode)) {
                return false;
            }
        }

        // Spectral data filter
        if (options.hasSpectralData) {
            if (!paint.behavior?.spectralReflectance && !paint.behavior?.kmCoefficients) {
                return false;
            }
        }

        // Text search (name)
        if (options.query) {
            const query = options.query.toLowerCase();
            const nameMatch = paint.name.toLowerCase().includes(query);
            const slugMatch = paint.slug.toLowerCase().includes(query);
            const pigmentMatch = paint.pigmentCodes.some(code =>
                code.toLowerCase().includes(query)
            );
            if (!nameMatch && !slugMatch && !pigmentMatch) {
                return false;
            }
        }

        return true;
    });
}

// ============================================================================
// Compatibility Layer
// ============================================================================

/**
 * Convert new Paint format to legacy Pigment format for backward compatibility.
 * This allows existing spectral adapter code to work with new paint data.
 */
export function paintToPigment(paint: Paint): {
    id: string;
    name: string;
    hex: string;
    tintingStrength: number;
    isValueAdjuster?: boolean;
} {
    const isWhite = paint.pigmentCodes.some(code => code.startsWith('PW'));
    const isBlack = paint.pigmentCodes.some(code => code.startsWith('PBk'));

    return {
        id: paint.id,
        name: paint.name,
        hex: paint.hex,
        tintingStrength: paint.behavior?.tintingStrength ?? 1.0,
        isValueAdjuster: isWhite || isBlack,
    };
}

/**
 * Get paints formatted as legacy Pigment array.
 * For backward compatibility with existing solveRecipe.ts.
 */
export async function getPaintsAsLegacyPigments(options?: PaintSearchOptions) {
    const paints = await getPaints(options);
    return paints.map(paintToPigment);
}
