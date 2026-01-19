/**
 * Type definitions for the paint library system.
 * Supports multiple brands, lines, and individual paint tubes.
 */

// ============================================================================
// Pigment Data
// ============================================================================

/**
 * Standard Color Index pigment code (e.g., "PW6" = Pigment White 6 = Titanium Dioxide)
 * See: https://www.artiscreation.com/Color_index_names.html
 */
export type PigmentCode = string;

/**
 * Opacity classification for a paint.
 */
export type Opacity = 'transparent' | 'semi-transparent' | 'semi-opaque' | 'opaque';

/**
 * Lightfastness/permanence rating.
 * Most professional brands use a similar A-C or I-IV system.
 */
export type Permanence =
    | 'extremely-permanent'  // AA / I
    | 'permanent'            // A / II 
    | 'moderately-durable'   // B / III
    | 'fugitive';            // C / IV

/**
 * Series number (affects price - higher = more expensive pigments).
 */
export type Series = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Paint medium type.
 */
export type Medium = 'oil' | 'acrylic' | 'watercolor' | 'gouache' | 'casein' | 'encaustic';

// ============================================================================
// Spectral / Behavior Data (for future accuracy improvements)
// ============================================================================

/**
 * Spectral reflectance data.
 * 380nm to 730nm in 10nm steps = 36 values.
 */
export interface SpectralReflectance {
    /** Wavelengths in nm (typically 380, 390, ..., 730) */
    wavelengths: number[];
    /** Reflectance values (0-1) at each wavelength */
    values: number[];
}

/**
 * Kubelka-Munk absorption/scattering coefficients.
 * These are the "real" paint behavior data for accurate mixing.
 */
export interface KMCoefficients {
    /** Wavelengths in nm */
    wavelengths: number[];
    /** Absorption coefficients K at each wavelength */
    K: number[];
    /** Scattering coefficients S at each wavelength */
    S: number[];
}

/**
 * Placeholder for behavior data we may add later.
 * This is where measured spectral data would go.
 */
export interface PaintBehavior {
    /**
     * Measured spectral reflectance curve.
     * If present, use this for accurate mixing.
     */
    spectralReflectance?: SpectralReflectance;

    /**
     * Kubelka-Munk coefficients.
     * If present, use these for K-M mixing.
     */
    kmCoefficients?: KMCoefficients;

    /**
     * Tinting strength relative to titanium white (baseline 1.0).
     * Phthalos are typically 5-10+, earth colors ~0.8-1.0.
     */
    tintingStrength?: number;

    /**
     * Covering power (how opaque the paint is in practice).
     * 0 = fully transparent, 1 = fully opaque.
     * This is different from the categorical "opacity" field.
     */
    coveringPower?: number;

    /**
     * Drying time category.
     */
    dryingTime?: 'fast' | 'medium' | 'slow' | 'very-slow';

    /**
     * Oil absorption (grams of oil per 100g pigment).
     * Higher = more oil needed = more transparent film.
     */
    oilAbsorption?: number;
}

// ============================================================================
// Paint & Brand Definitions
// ============================================================================

/**
 * A single paint tube from a specific brand and line.
 */
export interface Paint {
    /** Unique ID: "brand-id/line-id/paint-slug" */
    id: string;

    /** Brand identifier (e.g., "winsor-newton") */
    brandId: string;

    /** Line identifier within brand (e.g., "winton", "artists-oil") */
    lineId: string;

    /** Display name as on tube (e.g., "Titanium White") */
    name: string;

    /** URL-friendly slug (e.g., "titanium-white") */
    slug: string;

    /** Color Index pigment codes (e.g., ["PW6"]) */
    pigmentCodes: PigmentCode[];

    /** Opacity classification */
    opacity: Opacity;

    /** Permanence rating */
    permanence: Permanence;

    /** Price series (1 = cheapest) */
    series: Series;

    /**
     * Approximate hex color for display.
     * NOT measured spectral data - just for UI preview.
     */
    hex: string;

    /**
     * Additional notes (e.g., "Cool undertone", "Mix of PY42 + PBk9").
     */
    notes?: string;

    /**
     * Behavior data for accurate mixing (optional).
     * Most paints will NOT have this until measured.
     */
    behavior?: PaintBehavior;

    /**
     * Paint medium (oil, acrylic, etc.).
     * Optional - inferred from line if not specified.
     */
    medium?: Medium;
}

/**
 * A line of paints within a brand (e.g., "Winton" vs "Artists' Oil Colour").
 */
export interface PaintLine {
    /** Unique ID within brand (e.g., "winton") */
    id: string;

    /** Display name (e.g., "Winton Oil Colour") */
    name: string;

    /** Short description */
    description?: string;

    /** Quality tier */
    quality: 'student' | 'professional' | 'premium';

    /** URL for more info */
    url?: string;
}

/**
 * A paint brand (e.g., Winsor & Newton, Gamblin, Old Holland).
 */
export interface PaintBrand {
    /** Unique brand ID (e.g., "winsor-newton") */
    id: string;

    /** Display name (e.g., "Winsor & Newton") */
    name: string;

    /** Country of origin */
    country?: string;

    /** Brand website */
    url?: string;

    /** Available paint lines */
    lines: PaintLine[];
}

/**
 * Complete paint data file format.
 * Each JSON file in /data/paints/<brand>/<line>.json follows this structure.
 */
export interface PaintDataFile {
    /** Brand information */
    brand: PaintBrand;

    /** Line information */
    line: PaintLine;

    /** All paints in this line */
    paints: Omit<Paint, 'id' | 'brandId' | 'lineId'>[];
}

// ============================================================================
// Runtime Types
// ============================================================================

/**
 * Loaded paint catalog with all brands/lines.
 */
export interface PaintCatalogData {
    brands: PaintBrand[];
    paints: Paint[];
}

/**
 * Search/filter options for paint catalog.
 */
export interface PaintSearchOptions {
    /** Filter by brand ID */
    brandId?: string;

    /** Filter by line ID */
    lineId?: string;

    /** Filter by opacity */
    opacity?: Opacity | Opacity[];

    /** Filter by permanence (only include if >= this level) */
    minPermanence?: Permanence;

    /** Filter by pigment code (paint must contain this code) */
    pigmentCode?: PigmentCode;

    /** Text search in name */
    query?: string;

    /** Only include paints with spectral data */
    hasSpectralData?: boolean;
}
