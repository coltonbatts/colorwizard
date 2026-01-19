/**
 * Paint Importer Interface
 * 
 * Defines the contract for paint data importers.
 * Supports multiple formats: JSON, CSV, and specialized formats like ArtistPigments.
 */

import type { Paint, PaintBrand, PaintLine, Medium } from '../types/Paint';

// ============================================================================
// Import Types
// ============================================================================

/**
 * Result of a paint import operation.
 */
export interface PaintImportResult {
    /** Brand information */
    brand: PaintBrand;

    /** Line information */
    line: PaintLine;

    /** Imported paints */
    paints: Omit<Paint, 'id' | 'brandId' | 'lineId'>[];

    /** Import warnings (non-fatal) */
    warnings?: string[];

    /** Import errors (fatal) */
    errors?: string[];
}

/**
 * Validation result for import data.
 */
export interface ImportValidationResult {
    /** Whether the data is valid */
    valid: boolean;

    /** Validation errors */
    errors: string[];

    /** Validation warnings */
    warnings: string[];
}

/**
 * Base configuration for importers.
 */
export interface ImporterConfig {
    /** Default medium if not specified in data */
    defaultMedium?: Medium;

    /** Whether to skip paints with missing required fields */
    skipInvalid?: boolean;

    /** Whether to normalize color names (trim, title case) */
    normalizeNames?: boolean;
}

// ============================================================================
// Importer Interface
// ============================================================================

/**
 * Interface for paint data importers.
 * Implement this to add support for new data formats.
 */
export interface PaintImporter {
    /** Human-readable name of the importer */
    readonly name: string;

    /** Supported file extensions (e.g., ['.json', '.csv']) */
    readonly supportedFormats: string[];

    /**
     * Import paint data from a string or buffer.
     * @param data - Raw data to import
     * @param config - Import configuration
     * @returns Import result with paints and any errors/warnings
     */
    import(data: string | Buffer, config?: ImporterConfig): Promise<PaintImportResult>;

    /**
     * Validate import data without importing.
     * @param data - Raw data to validate
     * @returns Validation result
     */
    validate(data: string | Buffer): Promise<ImportValidationResult>;
}

// ============================================================================
// CSV Column Mapping
// ============================================================================

/**
 * Mapping of CSV column headers to paint fields.
 */
export interface CSVColumnMapping {
    /** Column name for paint display name */
    name: string;

    /** Column name for hex color (with or without #) */
    hex: string;

    /** Column name for pigment codes (comma-separated) */
    pigmentCodes?: string;

    /** Column name for paint slug (auto-generated if not provided) */
    slug?: string;

    /** Column name for opacity */
    opacity?: string;

    /** Column name for permanence */
    permanence?: string;

    /** Column name for series/price tier */
    series?: string;

    /** Column name for notes */
    notes?: string;

    /** Column name for medium */
    medium?: string;
}

/**
 * Configuration specific to CSV imports.
 */
export interface CSVImporterConfig extends ImporterConfig {
    /** Column header mappings */
    columns: CSVColumnMapping;

    /** Brand info (required for CSV since it's not in the file) */
    brandInfo: Omit<PaintBrand, 'lines'>;

    /** Line info (required for CSV since it's not in the file) */
    lineInfo: PaintLine;

    /** CSV delimiter (default: ',') */
    delimiter?: string;

    /** Whether to skip the header row (default: true) */
    hasHeader?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Slugify a paint name for URL-friendly IDs.
 */
export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Normalize a hex color to include # prefix.
 */
export function normalizeHex(hex: string): string {
    hex = hex.trim();
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    return hex.toUpperCase();
}

/**
 * Parse opacity string to typed value.
 */
export function parseOpacity(value: string): 'transparent' | 'semi-transparent' | 'semi-opaque' | 'opaque' {
    const normalized = value.toLowerCase().trim();
    if (normalized.includes('opaque') && !normalized.includes('semi')) return 'opaque';
    if (normalized.includes('semi') && normalized.includes('opaque')) return 'semi-opaque';
    if (normalized.includes('semi') && normalized.includes('trans')) return 'semi-transparent';
    if (normalized.includes('trans')) return 'transparent';
    return 'semi-opaque'; // default
}

/**
 * Parse permanence string to typed value.
 */
export function parsePermanence(value: string): 'fugitive' | 'moderately-durable' | 'permanent' | 'extremely-permanent' {
    const normalized = value.toLowerCase().trim();
    if (normalized.includes('extremely') || normalized === 'aa' || normalized === 'i') return 'extremely-permanent';
    if (normalized.includes('permanent') || normalized === 'a' || normalized === 'ii') return 'permanent';
    if (normalized.includes('durable') || normalized.includes('moderate') || normalized === 'b' || normalized === 'iii') return 'moderately-durable';
    return 'fugitive';
}

/**
 * Parse series/price tier string to number.
 */
export function parseSeries(value: string): 1 | 2 | 3 | 4 | 5 | 6 {
    const num = parseInt(value, 10);
    if (num >= 1 && num <= 6) return num as 1 | 2 | 3 | 4 | 5 | 6;
    return 1;
}
