/**
 * Canonical Color Types
 */

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface HSL {
    h: number;
    s: number;
    l: number;
}

export interface ColorData {
    hex: string;
    rgb: RGB;
    hsl: HSL;
}

export interface ValueMetadata {
    y: number;
    step: number;
    range: [number, number];
    percentile: number;
}
