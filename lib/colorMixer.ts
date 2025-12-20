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
  steps: string[] // New field
}

/**
 * Generates an oil paint mixing recipe with step-by-step instructions.
 */
export function generatePaintRecipe(hsl: { h: number; s: number; l: number }): MixingRecipe {
  // 1. Get ingredients from the core logic
  const baseRecipe = determineIngredients(hsl);

  // 2. Generate steps
  const steps = generateMixingSteps(baseRecipe.colors, baseRecipe.notes);

  return {
    ...baseRecipe,
    steps
  };
}

/**
 * Helper to generate logical mixing steps from ingredients
 */
function generateMixingSteps(colors: PaintColor[], notes?: string): string[] {
  const steps: string[] = [];

  // Sort colors by amount roughly (though input should be sorted)
  // Importance: base/mostly > moderate > small amount > touch > tiny touch > none
  // We assume the received 'colors' array is substantially ordered by logic.

  const base = colors.find(c => c.amount === 'base' || c.amount === 'mostly');
  const others = colors.filter(c => c !== base && c.amount !== 'none');

  if (base) {
    steps.push(`Start with a generous amount of **${base.name}** as your base.`);
  } else if (colors.length > 0) {
    steps.push(`Start with **${colors[0].name}**.`);
  }

  // Group adjustments
  const tinting = others.filter(c => ['Titanium White', 'Ivory Black'].includes(c.name));
  const chromatic = others.filter(c => !['Titanium White', 'Ivory Black'].includes(c.name));

  // Chromatic adjustments first
  if (chromatic.length > 0) {
    chromatic.forEach(c => {
      steps.push(`Mix in ${c.amount === 'moderate' ? '' : 'a'} **${c.amount}** of **${c.name}** to shift the hue.`);
    });
  }

  // Value adjustments
  if (tinting.length > 0) {
    tinting.forEach(c => {
      steps.push(`Adjust value with a **${c.amount}** of **${c.name}**.`);
    });
  }

  steps.push('Mix thoroughly with your palette knife.');

  if (notes) {
    steps.push(`Tip: ${notes}`);
  }

  return steps;
}

/**
 * Internal logic to determine ingredients
 */
function determineIngredients(hsl: {
  h: number
  s: number
  l: number
}): Omit<MixingRecipe, 'steps'> {
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
  let recipe: Omit<MixingRecipe, 'steps'>

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
    } else if (isModeratelySaturated) {
      // Moderate reds (natural red)
      recipe = {
        description: 'Natural red',
        colors: [
          { name: 'Cadmium Red', amount: 'mostly' },
          { name: 'Titanium White', amount: 'moderate' },
          { name: 'Yellow Ochre', amount: 'small amount' }, // Warms and dulls slightly
        ],
      }
    } else {
      // Saturated reds (vibrant)
      recipe = {
        description: 'Vibrant red',
        colors: [
          { name: 'Cadmium Red', amount: 'mostly' },
          { name: 'Titanium White', amount: isLight ? 'moderate' : 'touch' },
          // Pure Cad Red is very saturated, so we just add white/black as needed
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
    } else if (isModeratelySaturated) {
      // Natural orange/terracotta
      recipe = {
        description: 'Natural orange/terracotta',
        colors: [
          { name: 'Yellow Ochre', amount: 'base' },
          { name: 'Cadmium Red', amount: 'moderate' },
          { name: 'Titanium White', amount: 'moderate' },
        ],
      }
    } else {
      // Bright oranges
      recipe = {
        description: 'Vibrant orange',
        colors: [
          { name: 'Cadmium Red', amount: 'base' },
          { name: 'Yellow Ochre', amount: 'moderate' }, // Yellow Ochre + Cad Red makes a good natural orange
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
    } else if (isModeratelySaturated) {
      // Natural yellow
      recipe = {
        description: 'Natural yellow',
        colors: [
          { name: 'Yellow Ochre', amount: 'mostly' },
          { name: 'Titanium White', amount: 'moderate' },
          { name: 'Cadmium Red', amount: 'tiny touch' }, // Adds warmth
        ],
      }
    } else {
      // Bright yellows
      recipe = {
        description: 'Vibrant yellow',
        colors: [
          { name: 'Yellow Ochre', amount: 'mostly' },
          { name: 'Titanium White', amount: 'generous' }, // Need lots of white to brighten Ochre
          { name: 'Cadmium Red', amount: 'none' },
        ],
        notes: 'Yellow Ochre is naturally muted. To get a vivid yellow, you would typically need Cadmium Yellow, but adding White to Ochre is our best approximation.',
      }
    }
  }
  // Yellow-greens (75-100)
  else if (h > 75 && h <= 100) {
    if (isDesaturated) {
      recipe = {
        description: 'Gray-green',
        colors: [
          { name: 'Yellow Ochre', amount: 'base' },
          { name: 'Ivory Black', amount: 'small amount' }, // Yellow Ochre + Black = Greenish Gray
          { name: 'Titanium White', amount: 'moderate' },
        ],
      }
    } else if (isModeratelySaturated) {
      recipe = {
        description: 'Natural yellow-green',
        colors: [
          { name: 'Yellow Ochre', amount: 'base' },
          { name: 'Phthalo Green', amount: 'tiny touch' },
          { name: 'Titanium White', amount: isLight ? 'moderate' : 'small amount' },
        ],
      }
    } else {
      recipe = {
        description: 'Vibrant lime green',
        colors: [
          { name: 'Yellow Ochre', amount: 'base' },
          { name: 'Phthalo Green', amount: 'small amount' }, // Slightly more green
          { name: 'Titanium White', amount: 'moderate' },
        ],
        notes: 'Phthalo Green is very strong - use sparingly',
      }
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
    } else if (isModeratelySaturated) {
      // Natural green (grass)
      recipe = {
        description: 'Leaf green',
        colors: [
          { name: 'Yellow Ochre', amount: 'moderate' },
          { name: 'Phthalo Green', amount: 'small amount' },
          { name: 'Titanium White', amount: isLight ? 'generous' : 'moderate' },
          { name: 'Ivory Black', amount: 'tiny touch' }, // Dulls it slightly
        ],
      }
    } else {
      // Bright greens
      recipe = {
        description: 'Vibrant green',
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
    if (isDesaturated) {
      recipe = {
        description: 'Gray-teal',
        colors: [
          { name: 'Titanium White', amount: 'base' },
          { name: 'Ivory Black', amount: 'small amount' },
          { name: 'Phthalo Green', amount: 'tiny touch' },
          { name: 'Phthalo Blue', amount: 'tiny touch' },
        ],
      }
    } else if (isModeratelySaturated) {
      recipe = {
        description: 'Muted turquoise',
        colors: [
          { name: 'Phthalo Blue', amount: 'small amount' },
          { name: 'Phthalo Green', amount: 'small amount' },
          { name: 'Titanium White', amount: 'generous' },
          { name: 'Ivory Black', amount: 'tiny touch' },
        ],
      }
    } else {
      recipe = {
        description: 'Vibrant cyan/turquoise',
        colors: [
          { name: 'Phthalo Blue', amount: 'small amount' },
          { name: 'Phthalo Green', amount: 'small amount' },
          { name: 'Titanium White', amount: 'generous' },
        ],
        notes: 'Both phthalos are very strong - use tiny amounts',
      }
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
    } else if (isModeratelySaturated) {
      // Moderate blue
      recipe = {
        description: 'Natural blue',
        colors: [
          { name: 'Phthalo Blue', amount: 'small amount' },
          { name: 'Titanium White', amount: 'generous' },
          { name: 'Ivory Black', amount: 'tiny touch' }, // Dulls it
        ],
      }
    } else {
      // Saturated blues
      recipe = {
        description: 'Vibrant blue',
        colors: [
          { name: 'Phthalo Blue', amount: 'moderate' },
          { name: 'Titanium White', amount: isLight ? 'moderate' : 'small amount' },
          // No black for vibrant blue
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
    } else if (isModeratelySaturated) {
      // Moderate purple
      recipe = {
        description: 'Natural purple',
        colors: [
          { name: 'Phthalo Blue', amount: 'small amount' },
          { name: 'Cadmium Red', amount: 'moderate' },
          { name: 'Titanium White', amount: 'moderate' },
          { name: 'Yellow Ochre', amount: 'tiny touch' }, // Dulls it
        ],
      }
    } else {
      // Bright purples
      recipe = {
        description: 'Vibrant purple',
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
    } else if (isModeratelySaturated) {
      // Moderate magenta
      recipe = {
        description: 'Natural magenta',
        colors: [
          { name: 'Cadmium Red', amount: 'base' },
          { name: 'Phthalo Blue', amount: 'small amount' },
          { name: 'Titanium White', amount: 'moderate' },
          { name: 'Yellow Ochre', amount: 'tiny touch' },
        ],
      }
    } else {
      // Bright magentas
      recipe = {
        description: 'Vibrant magenta',
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
