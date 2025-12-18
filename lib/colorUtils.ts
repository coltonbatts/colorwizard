/**
 * Color utility functions for Perceptual Color Matching.
 * Focuses on RGB <-> Lab conversion and Delta E calculation.
 */

// Interface for RGB color
export interface RGB {
  r: number;
  g: number;
  b: number;
}

// Interface for Lab color
export interface Lab {
  l: number;
  a: number;
  b: number;
}

/**
 * Calculates the Delta E (CIE76) distance between two Lab colors.
 * This represents perceptual color difference.
 * A value of 2.3 is considered a JND (Just Noticeable Difference).
 */
export function deltaE(lab1: Lab, lab2: Lab): number {
  const dL = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Converts Hex string to RGB object
 */
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Converts RGB to Lab color space.
 * This goes through an intermediate XYZ conversion.
 * Assumes sRGB input.
 */
export function rgbToLab(r: number, g: number, b: number): Lab {
  // 1. Convert sRGB to linear RGB
  let rLinear = r / 255;
  let gLinear = g / 255;
  let bLinear = b / 255;

  rLinear = rLinear > 0.04045 ? Math.pow((rLinear + 0.055) / 1.055, 2.4) : rLinear / 12.92;
  gLinear = gLinear > 0.04045 ? Math.pow((gLinear + 0.055) / 1.055, 2.4) : gLinear / 12.92;
  bLinear = bLinear > 0.04045 ? Math.pow((bLinear + 0.055) / 1.055, 2.4) : bLinear / 12.92;

  // 2. Convert Linear RGB to XYZ
  // D65 standard illuminant
  let x = rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805;
  let y = rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722;
  let z = rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505;

  // 3. Convert XYZ to Lab
  // Reference white D65
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  x = x * 100 / refX;
  y = y * 100 / refY;
  z = z * 100 / refZ;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16/116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16/116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16/116);

  return {
    l: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  };
}
