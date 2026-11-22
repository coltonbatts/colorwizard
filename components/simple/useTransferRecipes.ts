import { useEffect, useMemo, useState } from 'react'
import { formatAmount } from '@/lib/paint/paintFit'
import { resolvePalettePigments } from '@/lib/paint/palettePigments'
import type { CanvasLandmark } from '@/lib/paint/canvasSetup'
import type { SpectralRecipe } from '@/lib/spectral/types'
import type { Palette } from '@/lib/types/palette'

export interface TrialRecipes {
  pending: boolean
  recipes: Record<string, SpectralRecipe | null>
}

export function paintPaletteKey(palette: Palette): string {
  return JSON.stringify([palette.id, resolvePalettePigments(palette.colors).map(({ id, name, hex, tintingStrength }) => [id, name, hex, tintingStrength])])
}

export function trialRecipeText(recipe: SpectralRecipe): string {
  return recipe.ingredients.map((ingredient) => `${formatAmount(recipe, ingredient)} ${ingredient.pigment.name}`).join(' + ')
}

export function useTransferRecipes(landmarks: CanvasLandmark[] | undefined, palette: Palette): TrialRecipes {
  const hexes = [...new Set(landmarks?.flatMap(({ trial }) => trial ? [trial.hex] : []))].sort().join(',')
  const pigments = useMemo(() => resolvePalettePigments(palette.colors), [palette])
  const [result, setResult] = useState<{ hexes: string; pigments: typeof pigments; recipes: TrialRecipes['recipes'] }>()
  useEffect(() => {
    if (!hexes) return
    let cancelled = false
    const solve = async () => {
      const { solvePaint } = await import('./solvePaint')
      const recipes: TrialRecipes['recipes'] = {}
      for (const hex of hexes.split(',')) {
        if (cancelled) return
        recipes[hex] = await solvePaint(hex, { pigments }).catch(() => null)
      }
      if (!cancelled) setResult({ hexes, pigments, recipes })
    }
    void solve().catch(() => {
      if (!cancelled) setResult({ hexes, pigments, recipes: {} })
    })
    return () => { cancelled = true }
  }, [hexes, pigments])
  if (!hexes) return { pending: false, recipes: {} }
  return result?.hexes === hexes && result.pigments === pigments
    ? { pending: false, recipes: result.recipes }
    : { pending: true, recipes: {} }
}
