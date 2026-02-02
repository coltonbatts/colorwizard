/**
 * JSON Paint Importer
 * 
 * Imports paint data from our native PaintDataFile JSON format.
 * Includes schema validation for data integrity.
 */

import type { PaintDataFile, Paint } from '../types/Paint';
import type {
    PaintImporter,
    PaintImportResult,
    ImportValidationResult,
    ImporterConfig
} from './importer';
import { slugify, normalizeHex } from './importer';

// ============================================================================
// JSON Importer
// ============================================================================

/**
 * Importer for native JSON paint data format.
 */
export class JSONPaintImporter implements PaintImporter {
    readonly name = 'JSON Paint Importer';
    readonly supportedFormats = ['.json'];

    async import(data: string | Buffer, config?: ImporterConfig): Promise<PaintImportResult> {
        const dataString = typeof data === 'string' ? data : data.toString('utf-8');

        // Parse JSON
        let parsed: PaintDataFile;
        try {
            parsed = JSON.parse(dataString);
        } catch (e) {
            return {
                brand: { id: '', name: '', lines: [] },
                line: { id: '', name: '', quality: 'student' },
                paints: [],
                errors: [`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`]
            };
        }

        // Validate and return
        const validation = await this.validate(data);
        if (!validation.valid) {
            return {
                brand: parsed.brand || { id: '', name: '', lines: [] },
                line: parsed.line || { id: '', name: '', quality: 'student' },
                paints: [],
                errors: validation.errors,
                warnings: validation.warnings
            };
        }

        // Process paints
        const paints: Omit<Paint, 'id' | 'brandId' | 'lineId'>[] = [];
        const warnings: string[] = [...validation.warnings];

        for (const paintData of parsed.paints) {
            // Normalize hex
            const hex = normalizeHex(paintData.hex);

            // Ensure slug exists
            const slug = paintData.slug || slugify(paintData.name);

            // Apply default medium if configured
            const medium = paintData.medium || config?.defaultMedium;

            paints.push({
                ...paintData,
                hex,
                slug,
                medium
            } as Omit<Paint, 'id' | 'brandId' | 'lineId'>);
        }

        return {
            brand: { ...parsed.brand, lines: [parsed.line] },
            line: parsed.line,
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

        // Type guard
        if (!parsed || typeof parsed !== 'object') {
            return {
                valid: false,
                errors: ['Data must be an object'],
                warnings: []
            };
        }

        const obj = parsed as Record<string, unknown>;

        // Validate brand
        if (!obj.brand || typeof obj.brand !== 'object') {
            errors.push('Missing or invalid "brand" field');
        } else {
            const brand = obj.brand as Record<string, unknown>;
            if (!brand.id || typeof brand.id !== 'string') {
                errors.push('Brand must have a string "id" field');
            }
            if (!brand.name || typeof brand.name !== 'string') {
                errors.push('Brand must have a string "name" field');
            }
        }

        // Validate line
        if (!obj.line || typeof obj.line !== 'object') {
            errors.push('Missing or invalid "line" field');
        } else {
            const line = obj.line as Record<string, unknown>;
            if (!line.id || typeof line.id !== 'string') {
                errors.push('Line must have a string "id" field');
            }
            if (!line.name || typeof line.name !== 'string') {
                errors.push('Line must have a string "name" field');
            }
            if (!line.quality || !['student', 'professional', 'premium'].includes(line.quality as string)) {
                errors.push('Line must have a valid "quality" field (student, professional, or premium)');
            }
        }

        // Validate paints array
        if (!obj.paints || !Array.isArray(obj.paints)) {
            errors.push('Missing or invalid "paints" array');
        } else {
            for (let i = 0; i < obj.paints.length; i++) {
                const paint = obj.paints[i] as Record<string, unknown>;
                const prefix = `Paint[${i}]`;

                if (!paint.name || typeof paint.name !== 'string') {
                    errors.push(`${prefix}: Missing or invalid "name"`);
                }
                if (!paint.hex || typeof paint.hex !== 'string') {
                    errors.push(`${prefix}: Missing or invalid "hex"`);
                } else if (!/^#?[0-9A-Fa-f]{6}$/.test(paint.hex as string)) {
                    warnings.push(`${prefix}: Hex "${paint.hex}" may not be valid`);
                }
                if (!paint.pigmentCodes || !Array.isArray(paint.pigmentCodes)) {
                    errors.push(`${prefix}: Missing or invalid "pigmentCodes" array`);
                }
                if (!paint.opacity || !['transparent', 'semi-transparent', 'semi-opaque', 'opaque'].includes(paint.opacity as string)) {
                    errors.push(`${prefix}: Missing or invalid "opacity"`);
                }
                if (!paint.permanence || !['fugitive', 'moderately-durable', 'permanent', 'extremely-permanent'].includes(paint.permanence as string)) {
                    errors.push(`${prefix}: Missing or invalid "permanence"`);
                }
                if (paint.series === undefined || typeof paint.series !== 'number' || paint.series < 1 || paint.series > 6) {
                    errors.push(`${prefix}: Missing or invalid "series" (must be 1-6)`);
                }
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
export const jsonImporter = new JSONPaintImporter();
