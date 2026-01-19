/**
 * ArtistPigments Importer
 * 
 * Specialized importer for ArtistPigments.com export format.
 * Maps their specific field names to our paint schema.
 */

import type { Paint, PaintBrand, PaintLine, Medium } from '../types/Paint';
import type {
    PaintImporter,
    PaintImportResult,
    ImportValidationResult,
    ImporterConfig
} from './importer';
import { slugify, normalizeHex, parseOpacity, parsePermanence } from './importer';

// ============================================================================
// ArtistPigments Format Types
// ============================================================================

/**
 * ArtistPigments export format for a single paint.
 */
interface ArtistPigmentsPaint {
    /** Paint name */
    name: string;
    /** Brand name */
    brand: string;
    /** Paint line/range name */
    line?: string;
    /** Hex color */
    color?: string;
    hex?: string;
    /** Pigment codes (may be string or array) */
    pigments?: string | string[];
    pigment_codes?: string | string[];
    /** Opacity description */
    opacity?: string;
    transparency?: string;
    /** Lightfastness rating */
    lightfastness?: string;
    permanence?: string;
    /** Series number */
    series?: number | string;
    /** Additional notes */
    notes?: string;
    description?: string;
}

/**
 * ArtistPigments export file structure.
 */
interface ArtistPigmentsExport {
    paints: ArtistPigmentsPaint[];
    exportDate?: string;
    source?: string;
}

// ============================================================================
// Importer
// ============================================================================

export class ArtistPigmentsImporter implements PaintImporter {
    readonly name = 'ArtistPigments Importer';
    readonly supportedFormats = ['.json'];

    async import(data: string | Buffer, config?: ImporterConfig): Promise<PaintImportResult> {
        const dataString = typeof data === 'string' ? data : data.toString('utf-8');

        // Parse JSON
        let parsed: ArtistPigmentsExport | ArtistPigmentsPaint[];
        try {
            parsed = JSON.parse(dataString);
        } catch (e) {
            return {
                brand: { id: '', name: '', lines: [] },
                line: { id: '', name: '', quality: 'professional' },
                paints: [],
                errors: [`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`]
            };
        }

        // Handle both array and object formats
        const paintsArray = Array.isArray(parsed) ? parsed : parsed.paints;

        if (!paintsArray || paintsArray.length === 0) {
            return {
                brand: { id: '', name: '', lines: [] },
                line: { id: '', name: '', quality: 'professional' },
                paints: [],
                errors: ['No paints found in export']
            };
        }

        // Group by brand and line
        const brandLineMap = new Map<string, Map<string, ArtistPigmentsPaint[]>>();

        for (const paint of paintsArray) {
            const brandName = paint.brand || 'Unknown Brand';
            const lineName = paint.line || 'Default Line';

            if (!brandLineMap.has(brandName)) {
                brandLineMap.set(brandName, new Map());
            }
            const lineMap = brandLineMap.get(brandName)!;

            if (!lineMap.has(lineName)) {
                lineMap.set(lineName, []);
            }
            lineMap.get(lineName)!.push(paint);
        }

        // For now, just use the first brand/line combination
        // In a full implementation, you might return multiple results
        const [firstBrandName, firstLineMap] = brandLineMap.entries().next().value as [string, Map<string, ArtistPigmentsPaint[]>];
        const [firstLineName, firstPaints] = firstLineMap.entries().next().value as [string, ArtistPigmentsPaint[]];

        const brandId = slugify(firstBrandName);
        const lineId = slugify(firstLineName);

        const brand: PaintBrand = {
            id: brandId,
            name: firstBrandName,
            lines: []
        };

        const line: PaintLine = {
            id: lineId,
            name: firstLineName,
            quality: 'professional' // Default assumption
        };

        const paints: Omit<Paint, 'id' | 'brandId' | 'lineId'>[] = [];
        const warnings: string[] = [];

        for (const apPaint of firstPaints) {
            try {
                // Extract hex color
                const hexRaw = apPaint.color || apPaint.hex;
                if (!hexRaw) {
                    warnings.push(`Skipping "${apPaint.name}": No hex color`);
                    continue;
                }

                // Parse pigment codes
                let pigmentCodes: string[] = [];
                const pigmentSource = apPaint.pigments || apPaint.pigment_codes;
                if (typeof pigmentSource === 'string') {
                    pigmentCodes = pigmentSource
                        .split(/[,+\s]+/)
                        .map(c => c.trim().toUpperCase())
                        .filter(c => c.length > 0 && /^P[A-Z]+\d+/.test(c));
                } else if (Array.isArray(pigmentSource)) {
                    pigmentCodes = pigmentSource.map(c => c.trim().toUpperCase());
                }

                // Parse opacity
                const opacityRaw = apPaint.opacity || apPaint.transparency || '';
                const opacity = parseOpacity(opacityRaw);

                // Parse permanence
                const permanenceRaw = apPaint.lightfastness || apPaint.permanence || '';
                const permanence = parsePermanence(permanenceRaw);

                // Parse series
                let series: 1 | 2 | 3 | 4 | 5 | 6 = 1;
                if (apPaint.series) {
                    const seriesNum = typeof apPaint.series === 'number'
                        ? apPaint.series
                        : parseInt(apPaint.series, 10);
                    if (seriesNum >= 1 && seriesNum <= 6) {
                        series = seriesNum as 1 | 2 | 3 | 4 | 5 | 6;
                    }
                }

                paints.push({
                    name: apPaint.name,
                    slug: slugify(apPaint.name),
                    hex: normalizeHex(hexRaw),
                    pigmentCodes: pigmentCodes.length > 0 ? pigmentCodes : ['Unknown'],
                    opacity,
                    permanence,
                    series,
                    notes: apPaint.notes || apPaint.description,
                    medium: config?.defaultMedium
                });
            } catch (e) {
                warnings.push(`Error processing "${apPaint.name}": ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
        }

        // If there are multiple brands/lines, add a warning
        if (brandLineMap.size > 1 || firstLineMap.size > 1) {
            warnings.push(
                `Export contains multiple brands/lines. Only imported: ${firstBrandName} - ${firstLineName}. ` +
                `Split data by brand/line for separate imports.`
            );
        }

        return {
            brand: { ...brand, lines: [line] },
            line,
            paints,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    async validate(data: string | Buffer): Promise<ImportValidationResult> {
        const dataString = typeof data === 'string' ? data : data.toString('utf-8');
        const errors: string[] = [];
        const warnings: string[] = [];

        // Parse JSON
        let parsed: unknown;
        try {
            parsed = JSON.parse(dataString);
        } catch (e) {
            return {
                valid: false,
                errors: [`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`],
                warnings: []
            };
        }

        // Check structure
        let paintsArray: unknown[];
        if (Array.isArray(parsed)) {
            paintsArray = parsed;
        } else if (parsed && typeof parsed === 'object' && 'paints' in parsed) {
            const obj = parsed as { paints: unknown };
            if (!Array.isArray(obj.paints)) {
                errors.push('"paints" field must be an array');
                return { valid: false, errors, warnings };
            }
            paintsArray = obj.paints;
        } else {
            errors.push('Data must be an array of paints or an object with a "paints" array');
            return { valid: false, errors, warnings };
        }

        if (paintsArray.length === 0) {
            errors.push('No paints found');
            return { valid: false, errors, warnings };
        }

        // Validate first few paints
        for (let i = 0; i < Math.min(5, paintsArray.length); i++) {
            const paint = paintsArray[i] as Record<string, unknown>;
            if (!paint.name) {
                warnings.push(`Paint[${i}]: Missing "name" field`);
            }
            if (!paint.color && !paint.hex) {
                warnings.push(`Paint[${i}]: Missing "color" or "hex" field`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}

// Export singleton instance
export const artistPigmentsImporter = new ArtistPigmentsImporter();
