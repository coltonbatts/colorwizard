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

      <p className="text-sm text-gray-400 mb-6 italic border-l-2 border-gray-700 pl-3">{recipe.description}</p>

      {/* Steps */}
      <div className="mb-6">
        <h4 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">Mixing Steps</h4>
        <ol className="list-decimal list-outside ml-4 space-y-2 text-sm text-gray-300">
          {recipe.steps.map((step, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
          ))}
        </ol>
      </div>

      <div className="space-y-2 mb-6">
        <h4 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Ingredients</h4>
        {recipe.colors.map((color, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-800/30 rounded border border-gray-800"
          >
            <span className="font-medium text-gray-200 text-sm">{color.name}</span>
            <span className="text-xs text-gray-400 capitalize">
              {color.amount}
            </span>
          </div>
        ))}
      </div>

      {recipe.notes && (
        <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded mb-4">
          <p className="text-xs text-blue-200">
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
