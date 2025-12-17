/**
 * Represents a single paint color in a mixing recipe.
 *
 * @property {string} name - The name of the oil paint color (e.g., "Titanium White", "Cadmium Red")
 * @property {string} amount - A descriptive amount indicating how much of this color to use
 *                             (e.g., "mostly", "moderate", "small amount", "tiny touch", "none")
 *
 * @example
 * const paint: PaintColor = {
 *   name: "Phthalo Blue",
 *   amount: "small amount"
 * }
 */
export interface PaintColor {
  name: string
  amount: string
}

/**
 * Represents a complete oil paint mixing recipe for achieving a target color.
 *
 * @property {string} description - A brief description of the resulting color
 *                                 (e.g., "Rich red", "Muted blue/gray-blue", "Warm brown")
 * @property {PaintColor[]} colors - An ordered array of paint colors to mix together
 * @property {string} [notes] - Optional mixing notes, warnings, or tips for achieving the color
 *                              (e.g., "Phthalo Green is very strong - use sparingly")
 *
 * @example
 * const recipe: MixingRecipe = {
 *   description: "Light blue",
 *   colors: [
 *     { name: "Phthalo Blue", amount: "small amount" },
 *     { name: "Titanium White", amount: "generous" }
 *   ],
 *   notes: "Phthalo Blue is very strong"
 * }
 */
export interface MixingRecipe {
  description: string
  colors: PaintColor[]
  notes?: string
}

/**
 * Generates an oil paint mixing recipe to match a target color specified in HSL color space.
 *
 * This function analyzes the hue, saturation, and lightness values of a color and returns
 * a recipe for mixing oil paints from a limited palette of six colors:
 * - Titanium White (cool white base)
 * - Ivory Black (neutral black)
 * - Yellow Ochre (warm, muted yellow)
 * - Cadmium Red (warm, vibrant red)
 * - Phthalo Green (cool, intense green - use sparingly!)
 * - Phthalo Blue (cool, intense blue - use sparingly!)
 *
 * The algorithm works by:
 * 1. Analyzing lightness to determine if the color is very light, very dark, or mid-tone
 * 2. Analyzing saturation to determine if the color is vibrant or muted
 * 3. Identifying the hue family (reds, oranges, yellows, greens, blues, purples, magentas)
 * 4. Selecting appropriate base colors and mixing proportions
 * 5. Adding white to lighten or black to darken as needed
 * 6. Using complementary colors to desaturate when necessary
 *
 * @param {Object} hsl - The target color in HSL color space
 * @param {number} hsl.h - Hue value in degrees (0-360)
 *                         - 0/360: Red
 *                         - 60: Yellow
 *                         - 120: Green
 *                         - 180: Cyan
 *                         - 240: Blue
 *                         - 300: Magenta
 * @param {number} hsl.s - Saturation percentage (0-100)
 *                         - 0: Completely desaturated (gray)
 *                         - 100: Fully saturated (vivid color)
 * @param {number} hsl.l - Lightness percentage (0-100)
 *                         - 0: Black
 *                         - 50: Pure color
 *                         - 100: White
 *
 * @returns {MixingRecipe} A mixing recipe with paint colors, amounts, and optional notes
 *
 * @example
 * // Generate recipe for a sky blue color
 * const skyBlue = generatePaintRecipe({ h: 200, s: 70, l: 70 })
 * // Returns:
 * // {
 * //   description: "Light blue",
 * //   colors: [
 * //     { name: "Phthalo Blue", amount: "small amount" },
 * //     { name: "Titanium White", amount: "generous" }
 * //   ]
 * // }
 *
 * @example
 * // Generate recipe for a warm brown
 * const brown = generatePaintRecipe({ h: 30, s: 40, l: 35 })
 * // Returns:
 * // {
 * //   description: "Warm brown",
 * //   colors: [
 * //     { name: "Yellow Ochre", amount: "base" },
 * //     { name: "Cadmium Red", amount: "moderate" },
 * //     { name: "Ivory Black", amount: "small amount" },
 * //     { name: "Titanium White", amount: "touch" }
 * //   ]
 * // }
 *
 * @example
 * // Generate recipe for near-black
 * const nearBlack = generatePaintRecipe({ h: 0, s: 5, l: 10 })
 * // Returns:
 * // {
 * //   description: "Near-black mix",
 * //   colors: [
 * //     { name: "Ivory Black", amount: "mostly" },
 * //     { name: "Titanium White", amount: "tiny touch" }
 * //   ],
 * //   notes: "Very dark, almost pure black"
 * // }
 *
 * @remarks
 * - The phthalocyanine colors (Phthalo Blue and Phthalo Green) are extremely strong tinting
 *   colors in oil painting. The recipes reflect this by using "small amount" or "tiny touch"
 *   to avoid overwhelming the mixture.
 * - Yellow Ochre is a naturally muted, earthy yellow, making it versatile for mixing browns,
 *   greens, and muted colors without being too vibrant.
 * - Recipes are designed for traditional oil painting techniques on canvas and may require
 *   adjustment based on the specific paint brand, medium used, and painting surface.
 * - Amount descriptors are intentionally qualitative ("mostly", "moderate", "small amount",
 *   "tiny touch") as oil painting mixing is often done by eye rather than precise measurement.
 */
export function generatePaintRecipe(hsl: {
  h: number
  s: number
  l: number
}): MixingRecipe {
  const { h, s, l } = hsl

  // Determine if the color is very light, very dark, or mid-tone
  const isVeryLight = l > 80
  const isLight = l > 60
  const isDark = l < 30
  const isVeryDark = l < 15

  // Determine saturation level
  const isDesaturated = s < 20
  const isModeratelySaturated = s >= 20 && s < 60
  const isHighlySaturated = s >= 60

  // Handle near-black colors
  if (isVeryDark && s < 10) {
    return {
      description: 'Near-black mix',
      colors: [
        { name: 'Ivory Black', amount: 'mostly' },
        { name: 'Titanium White', amount: l > 5 ? 'tiny touch' : 'none' },
      ],
      notes: 'Very dark, almost pure black',
    }
  }

  // Handle near-white colors
  if (isVeryLight && s < 10) {
    return {
      description: 'Near-white mix',
      colors: [
        { name: 'Titanium White', amount: 'mostly' },
        { name: 'Ivory Black', amount: 'tiny touch' },
      ],
      notes: 'Very light, almost pure white',
    }
  }

  // Determine hue family and base mix
  let recipe: MixingRecipe

  // Reds (0-20 and 340-360)
  if ((h >= 0 && h <= 20) || h >= 340) {
    if (isDesaturated) {
      // Desaturated reds = warm grays/browns
      recipe = {
        description: 'Warm gray/pink',
        colors: [
          { name: 'Titanium White', amount: 'base' },
          { name: 'Cadmium Red', amount: 'small amount' },
          { name: 'Yellow Ochre', amount: 'touch' },
          { name: 'Ivory Black', amount: isDark ? 'moderate' : 'tiny touch' },
        ],
      }
    } else if (isLight) {
      // Light pinks
      recipe = {
        description: 'Pink/light red',
        colors: [
          { name: 'Titanium White', amount: 'mostly' },
          { name: 'Cadmium Red', amount: 'moderate' },
        ],
      }
    } else {
      // Saturated reds
      recipe = {
        description: 'Rich red',
        colors: [
          { name: 'Cadmium Red', amount: 'mostly' },
          { name: 'Titanium White', amount: isLight ? 'moderate' : 'touch' },
          { name: 'Ivory Black', amount: isDark ? 'small amount' : 'none' },
        ],
      }
    }
  }
  // Oranges (20-45)
  else if (h > 20 && h <= 45) {
    if (isDesaturated) {
      // Browns
      recipe = {
        description: 'Warm brown',
        colors: [
          { name: 'Yellow Ochre', amount: 'base' },
          { name: 'Cadmium Red', amount: 'moderate' },
          { name: 'Ivory Black', amount: 'small amount' },
          { name: 'Titanium White', amount: isLight ? 'moderate' : 'touch' },
        ],
      }
    } else {
      // Bright oranges
      recipe = {
        description: 'Orange',
        colors: [
          { name: 'Cadmium Red', amount: 'base' },
          { name: 'Yellow Ochre', amount: 'moderate' },
          { name: 'Titanium White', amount: isLight ? 'moderate' : 'touch' },
        ],
      }
    }
  }
  // Yellows (45-75)
  else if (h > 45 && h <= 75) {
    if (isDesaturated) {
      // Ochre/tan colors
      recipe = {
        description: 'Ochre/tan',
        colors: [
          { name: 'Yellow Ochre', amount: 'base' },
          { name: 'Titanium White', amount: isLight ? 'moderate' : 'small amount' },
          { name: 'Ivory Black', amount: isDark ? 'moderate' : 'tiny touch' },
        ],
      }
    } else {
      // Bright yellows
      recipe = {
        description: 'Warm yellow',
        colors: [
          { name: 'Yellow Ochre', amount: 'mostly' },
          { name: 'Titanium White', amount: 'moderate' },
          { name: 'Cadmium Red', amount: h < 60 ? 'tiny touch' : 'none' },
        ],
        notes: 'Yellow Ochre is already muted; for brighter yellow, add more white',
      }
    }
  }
  // Yellow-greens (75-100)
  else if (h > 75 && h <= 100) {
    recipe = {
      description: 'Yellow-green',
      colors: [
        { name: 'Yellow Ochre', amount: 'base' },
        { name: 'Phthalo Green', amount: 'tiny touch' },
        { name: 'Titanium White', amount: isLight ? 'moderate' : 'small amount' },
        { name: 'Ivory Black', amount: isDesaturated ? 'small amount' : 'none' },
      ],
      notes: 'Phthalo Green is very strong - use sparingly',
    }
  }
  // Greens (100-165)
  else if (h > 100 && h <= 165) {
    if (isDesaturated) {
      // Muted/olive greens
      recipe = {
        description: 'Muted/olive green',
        colors: [
          { name: 'Phthalo Green', amount: 'small amount' },
          { name: 'Yellow Ochre', amount: 'moderate' },
          { name: 'Ivory Black', amount: 'small amount' },
          { name: 'Titanium White', amount: isLight ? 'moderate' : 'touch' },
        ],
      }
    } else {
      // Bright greens
      recipe = {
        description: 'Green',
        colors: [
          { name: 'Phthalo Green', amount: 'small amount' },
          { name: 'Yellow Ochre', amount: 'moderate' },
          { name: 'Titanium White', amount: isLight ? 'generous' : 'moderate' },
        ],
        notes: 'Phthalo Green is very strong - use sparingly and mix well',
      }
    }
  }
  // Cyans/turquoises (165-190)
  else if (h > 165 && h <= 190) {
    recipe = {
      description: 'Cyan/turquoise',
      colors: [
        { name: 'Phthalo Blue', amount: 'small amount' },
        { name: 'Phthalo Green', amount: 'small amount' },
        { name: 'Titanium White', amount: 'generous' },
      ],
      notes: 'Both phthalos are very strong - use tiny amounts',
    }
  }
  // Blues (190-250)
  else if (h > 190 && h <= 250) {
    if (isDesaturated) {
      // Muted/gray blues
      recipe = {
        description: 'Muted blue/gray-blue',
        colors: [
          { name: 'Phthalo Blue', amount: 'small amount' },
          { name: 'Titanium White', amount: 'base' },
          { name: 'Ivory Black', amount: 'small amount' },
          { name: 'Yellow Ochre', amount: 'tiny touch' },
        ],
      }
    } else if (isLight) {
      // Light blues
      recipe = {
        description: 'Light blue',
        colors: [
          { name: 'Phthalo Blue', amount: 'small amount' },
          { name: 'Titanium White', amount: 'generous' },
        ],
      }
    } else {
      // Saturated blues
      recipe = {
        description: 'Rich blue',
        colors: [
          { name: 'Phthalo Blue', amount: 'moderate' },
          { name: 'Titanium White', amount: isLight ? 'moderate' : 'small amount' },
          { name: 'Ivory Black', amount: isDark ? 'small amount' : 'none' },
        ],
        notes: 'Phthalo Blue is very strong',
      }
    }
  }
  // Purples (250-290)
  else if (h > 250 && h <= 290) {
    if (isDesaturated) {
      // Muted purples/gray-purples
      recipe = {
        description: 'Muted purple/mauve',
        colors: [
          { name: 'Phthalo Blue', amount: 'small amount' },
          { name: 'Cadmium Red', amount: 'small amount' },
          { name: 'Titanium White', amount: 'moderate' },
          { name: 'Ivory Black', amount: 'small amount' },
        ],
      }
    } else {
      // Bright purples
      recipe = {
        description: 'Purple/violet',
        colors: [
          { name: 'Phthalo Blue', amount: 'moderate' },
          { name: 'Cadmium Red', amount: 'moderate' },
          { name: 'Titanium White', amount: isLight ? 'moderate' : 'small amount' },
        ],
      }
    }
  }
  // Magentas (290-340)
  else {
    if (isDesaturated) {
      // Muted magentas/dusty rose
      recipe = {
        description: 'Dusty rose/mauve',
        colors: [
          { name: 'Cadmium Red', amount: 'moderate' },
          { name: 'Phthalo Blue', amount: 'small amount' },
          { name: 'Titanium White', amount: 'moderate' },
          { name: 'Ivory Black', amount: 'tiny touch' },
        ],
      }
    } else {
      // Bright magentas
      recipe = {
        description: 'Magenta/pink-red',
        colors: [
          { name: 'Cadmium Red', amount: 'base' },
          { name: 'Phthalo Blue', amount: 'small amount' },
          { name: 'Titanium White', amount: isLight ? 'generous' : 'moderate' },
        ],
      }
    }
  }

  return recipe
}
