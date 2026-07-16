'use client'

import { formatSpectralModelError, getSpectralModelFitPresentation } from '@/lib/colorSemantics'

interface MixedColorPreviewProps {
  targetHex: string
  preview?: { predictedHex: string; matchQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor'; error: number } | null
  mixSource: 'solver' | 'heuristic'
  variant?: 'standard' | 'dashboard' | 'compact' | 'board'
}

export default function MixedColorPreview({ targetHex, preview = null, mixSource, variant = 'standard' }: MixedColorPreviewProps) {
  const fit = preview ? getSpectralModelFitPresentation(preview.error) : null
  return (
    <div className={`mixed-preview mixed-preview--${variant}`}>
      <div className="mixed-preview-swatches">
        <div>
          <span>Target</span>
          <i style={{ backgroundColor: targetHex }} />
          <code>{targetHex.toUpperCase()}</code>
        </div>
        <svg viewBox="0 0 28 12" width="28" height="12" aria-hidden="true"><path d="M1 6h24M20 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        <div>
          <span>Predicted</span>
          <i style={{ backgroundColor: preview?.predictedHex ?? targetHex }} />
          <code>{(preview?.predictedHex ?? targetHex).toUpperCase()}</code>
        </div>
      </div>
      <div className={`mixed-preview-fit ${preview ? `fit-${preview.matchQuality.toLowerCase()}` : ''}`} role="status">
        <i aria-hidden="true" />
        <strong>{fit?.label ?? (mixSource === 'heuristic' ? 'Starting guide' : 'Calculating fit')}</strong>
        {preview && <code>{formatSpectralModelError(preview.error)}</code>}
      </div>
    </div>
  )
}
