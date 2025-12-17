export interface PaintColor {
  name: string
  amount: string
}

export interface MixingRecipe {
  description: string
  colors: PaintColor[]
  notes?: string
}

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
