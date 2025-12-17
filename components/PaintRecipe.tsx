'use client'

import { generatePaintRecipe } from '@/lib/colorMixer'

interface PaintRecipeProps {
  hsl: { h: number; s: number; l: number }
}

export default function PaintRecipe({ hsl }: PaintRecipeProps) {
  const recipe = generatePaintRecipe(hsl)

  return (
    <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700">
      <h3 className="text-xl font-bold mb-4 text-gray-100">Oil Paint Recipe</h3>

      <p className="text-sm text-gray-400 mb-4 italic">{recipe.description}</p>

      <div className="space-y-3 mb-4">
        {recipe.colors.map((color, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700"
          >
            <span className="font-medium text-gray-200">{color.name}</span>
            <span className="text-sm text-gray-400 capitalize">
              {color.amount}
            </span>
          </div>
        ))}
      </div>

      {recipe.notes && (
        <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded">
          <p className="text-xs text-yellow-200">
            <strong>Note:</strong> {recipe.notes}
          </p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          Limited palette: Titanium White, Ivory Black, Yellow Ochre, Cadmium
          Red, Phthalo Green, Phthalo Blue
        </p>
      </div>
    </div>
  )
}
