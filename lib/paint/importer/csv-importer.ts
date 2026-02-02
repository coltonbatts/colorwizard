/**
 * CSV Paint Importer
 * 
 * Imports paint data from CSV files with configurable column mapping.
 * Useful for importing from spreadsheets or custom databases.
 */

import type { Paint } from '../types/Paint';
import type {
    PaintImporter,
    PaintImportResult,
    ImportValidationResult,
    CSVImporterConfig
} from './importer';
import {
    slugify,
    normalizeHex,
    parseOpacity,
    parsePermanence,
    parseSeries
} from './importer';

// ============================================================================
// CSV Parser (Simple)
// ============================================================================

/**
 * Parse a CSV string into rows.
 * Handles quoted fields and embedded commas.
 */
function parseCSV(data: string, delimiter = ','): string[][] {
    const rows: string[][] = [];
    const lines = data.split(/\r?\n/);

    for (const line of lines) {
        if (!line.trim()) continue;

        const row: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());
        rows.push(row);
    }

    return rows;
}

// ============================================================================
// CSV Importer
// ============================================================================

/**
 * Importer for CSV paint data with configurable column mapping.
 */
export class CSVPaintImporter implements PaintImporter {
    readonly name = 'CSV Paint Importer';
    readonly supportedFormats = ['.csv'];

    private config: CSVImporterConfig;

    constructor(config: CSVImporterConfig) {
        this.config = config;
    }

    async import(data: string | Buffer): Promise<PaintImportResult> {
        const dataString = typeof data === 'string' ? data : data.toString('utf-8');
        const delimiter = this.config.delimiter || ',';
        const rows = parseCSV(dataString, delimiter);

        if (rows.length === 0) {
            return {
                brand: { ...this.config.brandInfo, lines: [this.config.lineInfo] },
                line: this.config.lineInfo,
                paints: [],
                errors: ['CSV file is empty']
            };
        }

        // Get header row
        const hasHeader = this.config.hasHeader !== false;
        const headers = hasHeader ? rows[0] : [];
        const dataRows = hasHeader ? rows.slice(1) : rows;

        // Build column index map
        const colMap: Record<string, number> = {};
        if (hasHeader) {
            for (const [key, headerName] of Object.entries(this.config.columns)) {
                if (headerName) {
                    const index = headers.findIndex(h =>
                        h.toLowerCase().trim() === (headerName as string).toLowerCase().trim()
                    );
                    if (index !== -1) {
                        colMap[key] = index;
                    }
                }
            }
        }

        const paints: Omit<Paint, 'id' | 'brandId' | 'lineId'>[] = [];
        const warnings: string[] = [];
        const errors: string[] = [];

        // Validate required columns
        if (colMap.name === undefined) {
            errors.push(`Required column "${this.config.columns.name}" not found`);
        }
        if (colMap.hex === undefined) {
            errors.push(`Required column "${this.config.columns.hex}" not found`);
        }

        if (errors.length > 0) {
            return {
                brand: { ...this.config.brandInfo, lines: [this.config.lineInfo] },
                line: this.config.lineInfo,
                paints: [],
                errors
            };
        }

        // Process data rows
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowNum = hasHeader ? i + 2 : i + 1;

            try {
                const name = row[colMap.name]?.trim();
                const hex = row[colMap.hex]?.trim();

                if (!name || !hex) {
                    if (this.config.skipInvalid) {
                        warnings.push(`Row ${rowNum}: Skipping - missing name or hex`);
                        continue;
                    } else {
                        errors.push(`Row ${rowNum}: Missing required field (name or hex)`);
                        continue;
                    }
                }

                // Parse pigment codes (comma or + separated)
                const pigmentCodesRaw = colMap.pigmentCodes !== undefined
                    ? row[colMap.pigmentCodes] || ''
                    : '';
                const pigmentCodes = pigmentCodesRaw
                    .split(/[,+]/)
                    .map(c => c.trim().toUpperCase())
                    .filter(c => c.length > 0);

                // Build paint object
                const paint: Omit<Paint, 'id' | 'brandId' | 'lineId'> = {
                    name: this.config.normalizeNames ? toTitleCase(name) : name,
                    slug: colMap.slug !== undefined && row[colMap.slug]
                        ? row[colMap.slug].trim()
                        : slugify(name),
                    hex: normalizeHex(hex),
                    pigmentCodes: pigmentCodes.length > 0 ? pigmentCodes : ['Unknown'],
                    opacity: colMap.opacity !== undefined && row[colMap.opacity]
                        ? parseOpacity(row[colMap.opacity])
                        : 'semi-opaque',
                    permanence: colMap.permanence !== undefined && row[colMap.permanence]
                        ? parsePermanence(row[colMap.permanence])
                        : 'permanent',
                    series: colMap.series !== undefined && row[colMap.series]
                        ? parseSeries(row[colMap.series])
                        : 1,
                    notes: colMap.notes !== undefined ? row[colMap.notes]?.trim() : undefined,
                    medium: this.config.defaultMedium
                };

                paints.push(paint);
            } catch (e) {
                warnings.push(`Row ${rowNum}: Error processing - ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
        }

        return {
            brand: { ...this.config.brandInfo, lines: [this.config.lineInfo] },
            line: this.config.lineInfo,
            paints,
            warnings: warnings.length > 0 ? warnings : undefined,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    async validate(data: string | Buffer): Promise<ImportValidationResult> {
        const dataString = typeof data === 'string' ? data : data.toString('utf-8');
        const delimiter = this.config.delimiter || ',';
        const rows = parseCSV(dataString, delimiter);

        const errors: string[] = [];
        const warnings: string[] = [];

        if (rows.length === 0) {
            errors.push('CSV file is empty');
            return { valid: false, errors, warnings };
        }

        const hasHeader = this.config.hasHeader !== false;
        const headers = hasHeader ? rows[0] : [];

        // Check for required columns
        if (hasHeader) {
            const nameIndex = headers.findIndex(h =>
                h.toLowerCase().trim() === this.config.columns.name.toLowerCase().trim()
            );
            const hexIndex = headers.findIndex(h =>
                h.toLowerCase().trim() === this.config.columns.hex.toLowerCase().trim()
            );

            if (nameIndex === -1) {
                errors.push(`Required column "${this.config.columns.name}" not found in headers`);
            }
            if (hexIndex === -1) {
                errors.push(`Required column "${this.config.columns.hex}" not found in headers`);
            }
        }

        // Check data rows exist
        const dataRows = hasHeader ? rows.slice(1) : rows;
        if (dataRows.length === 0) {
            warnings.push('No data rows found');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert a string to Title Case.
 */
function toTitleCase(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
