import {
  getChromaLevel,
  getColorHarmonies,
  getMixingGuidance,
  getValueLevel,
} from '@/lib/colorTheory'

export interface AiSuggestion {
  type: string
  title: string
  description: string
  colors: string[]
  pigments?: string[]
}

export interface AiBaseAnalysis {
  chroma: string
  value: string
  mixingTip: string
}

export interface AiSuggestionsResult {
  baseAnalysis: AiBaseAnalysis
  suggestions: AiSuggestion[]
  isPro: boolean
}

/**
 * Pure color-theory “AI” suggestions (same output shape as the former API route).
 * Safe to run on the client for offline / static builds.
 */
export function generateAiSuggestions(
  rgb: { r: number; g: number; b: number },
  options: { isPro: boolean }
): AiSuggestionsResult {
  const { isPro } = options
  const harmonies = getColorHarmonies(rgb)
  const chroma = getChromaLevel(rgb)
  const value = getValueLevel(rgb)
  const mixing = getMixingGuidance(rgb)

  const suggestions: AiSuggestion[] = [
    {
      type: 'Classical Harmony',
      title: 'The Complementary Contrast',
      description: `To create maximum focal pop, use **${harmonies.complementary.name}** sparingly against your base color. In oil painting, mixing these two will create a perfect chromatic neutral.`,
      colors: [harmonies.complementary.color],
      pigments: isPro ? ['Cadmium Red', 'Ultramarine Blue'] : undefined,
    },
    {
      type: 'Atmospheric Perspective',
      title: 'Analogous Depth',
      description: `For subtle transitions in shadows, lean into **${harmonies.analogous[0].name}** and **${harmonies.analogous[1].name}**. This maintains a "single-light" atmosphere common in Caravaggio's works.`,
      colors: harmonies.analogous.map((a) => a.color),
      pigments: isPro ? ['Yellow Ochre', 'Raw Sienna'] : undefined,
    },
  ]

  if (isPro) {
    suggestions.push({
      type: 'Advanced Theory',
      title: 'Split-Complementary Tension',
      description: `Use **${harmonies.splitComplementary[0].name}** and **${harmonies.splitComplementary[1].name}** to create a sophisticated vibrance without the harshness of a direct complement. This is a common strategy for Impressionist skin tones.`,
      colors: harmonies.splitComplementary.map((s) => s.color),
      pigments: ['Alizarin Crimson', 'Viridian', 'Cobalt Blue'],
    })
  }

  return {
    baseAnalysis: {
      chroma: chroma.description,
      value: value.description,
      mixingTip: mixing.generalTip,
    },
    suggestions,
    isPro,
  }
}
