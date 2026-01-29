/**
 * Pro Features Showcase
 * Demonstrates available Pro features with gating
 */

'use client'

import ProFeatureSection from './ProFeatureSection'

export default function ProFeaturesShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 max-w-6xl mx-auto">
      {/* AI Palette Suggestions */}
      <ProFeatureSection
        feature="aiPaletteSuggestions"
        title="AI Palette Suggestions"
        icon="🤖"
      >
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 min-h-64">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🤖 AI Palette Suggestions</h3>
          <p className="text-gray-600 mb-4">
            Get color harmony suggestions powered by AI based on color theory principles.
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="w-12 h-12 bg-blue-500 rounded" />
              <div className="w-12 h-12 bg-blue-400 rounded" />
              <div className="w-12 h-12 bg-blue-300 rounded" />
              <div className="w-12 h-12 bg-blue-200 rounded" />
            </div>
          </div>
        </div>
      </ProFeatureSection>

      {/* Team Collaboration */}
      <ProFeatureSection
        feature="teamCollaboration"
        title="Team Collaboration"
        icon="👥"
      >
        <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-lg p-8 min-h-64">
          <h3 className="text-xl font-bold text-gray-900 mb-4">👥 Team Collaboration</h3>
          <p className="text-gray-600 mb-4">
            Share palettes with your team and collaborate in real-time.
          </p>
          <div className="space-y-2 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full" />
              <div className="text-sm">You</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full" />
              <div className="text-sm">Team Member</div>
            </div>
          </div>
        </div>
      </ProFeatureSection>

      {/* Advanced Presets */}
      <ProFeatureSection
        feature="advancedPresets"
        title="Advanced Presets & Filters"
        icon="🎨"
      >
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-8 min-h-64">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🎨 Advanced Presets</h3>
          <p className="text-gray-600 mb-4">
            Access premium color harmony presets and advanced workflows.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-white border border-gray-300 rounded px-3 py-2 text-xs font-medium">
              Monochromatic
            </div>
            <div className="bg-white border border-gray-300 rounded px-3 py-2 text-xs font-medium">
              Triadic
            </div>
            <div className="bg-white border border-gray-300 rounded px-3 py-2 text-xs font-medium">
              Complementary
            </div>
            <div className="bg-white border border-gray-300 rounded px-3 py-2 text-xs font-medium">
              Analogous
            </div>
          </div>
        </div>
      </ProFeatureSection>
    </div>
  )
}
