// Type declarations for spectral.js
// https://github.com/rvanwijnen/spectral.js

declare module 'spectral.js' {
    export class Color {
        constructor(input: string | number[]);

        /** Reflectance curve from 380 to 750 nm in 10 nm steps */
        R: number[];

        /** sRGB color space representation [r, g, b] 0-255 */
        sRGB: [number, number, number];

        /** linear RGB color space representation */
        lRGB: [number, number, number];

        /** CIE XYZ color space representation */
        XYZ: [number, number, number];

        /** OKLab color space representation [L, a, b] */
        OKLab: [number, number, number];

        /** OKLCh color representation [L, C, h] */
        OKLCh: [number, number, number];

        /** Kubelka-Munk absorption/scattering parameters */
        KS: number[];

        /** Luminance (Y value from CIE XYZ) */
        luminance: number;

        /** Intensity of the pigment mixture (default: 1) */
        tintingStrength: number;

        /** Checks if the color is within the displayable gamut */
        inGamut(options?: { epsilon?: number }): boolean;

        /** Adjusts color to fit within the gamut */
        toGamut(options?: { method?: 'clip' | 'map' }): Color;

        /** Returns the color as a hex or RGB string */
        toString(options?: { format?: 'hex' | 'rgb'; method?: 'map' | 'clip' }): string;
    }

    /** Mix multiple colors with weights */
    export function mix(...args: [Color, number][]): Color;

    /** Generate a palette between two colors */
    export function palette(color1: Color, color2: Color, size: number): Color[];

    /** Get color at position in gradient */
    export function gradient(t: number, ...args: [Color, number][]): Color;
}
