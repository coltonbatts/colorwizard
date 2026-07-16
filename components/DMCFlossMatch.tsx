'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getThreadMatchContext, getDMCColorFamily } from '@/lib/dmcFloss'
import type { ThreadMatchResult } from '@/lib/dmcFloss'
import type { ImageValueContext } from '@/lib/dmc/types'
import { formatCatalogDeltaE00, PICKED_COLOR_DISCLAIMER, VALUE_ANALYSIS_NOTE } from '@/lib/colorSemantics'
import { computeValueScale, getStepIndex, stepToGray } from '@/lib/valueScale'
import type { ValueBuffer } from '@/hooks/useImageAnalyzer'

interface DMCFlossMatchProps {
  rgb: { r: number; g: number; b: number }
  imageValue?: ImageValueContext | null
  valueBuffer?: ValueBuffer | null
  valueScaleClip?: number
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
}

function valueBand(lightness: number) {
  if (lightness >= 0.88) return 'Very light'
  if (lightness >= 0.74) return 'Light'
  if (lightness >= 0.58) return 'Mid'
  if (lightness >= 0.42) return 'Dark'
  if (lightness >= 0.28) return 'Very dark'
  return 'Deep dark'
}

export default function DMCFlossMatch({ rgb, imageValue, valueBuffer, valueScaleClip = 0, onColorSelect }: DMCFlossMatchProps) {
  const [context, setContext] = useState<ThreadMatchResult | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getThreadMatchContext(rgb, { alternativeCount: 3, imageValue, topMatchCount: 4 })
      .then((result) => { if (!cancelled) setContext(result) })
      .catch((error) => { console.error('DMC Matching Error:', error); if (!cancelled) setContext(null) })
    return () => { cancelled = true }
  }, [imageValue, rgb])

  const copyCode = useCallback(async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    window.setTimeout(() => setCopiedCode(null), 1600)
  }, [])

  if (!context) return <div className="panel-empty"><strong>Finding thread match…</strong></div>
  const { primary, familyLadder, topMatches, alternatives, valueWarnings } = context
  const sampleHex = `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1).toUpperCase()}`
  const alternativesList = [...topMatches, ...alternatives].filter((thread, index, all) => thread.id !== primary.id && all.findIndex((candidate) => candidate.id === thread.id) === index)
  const suggestions = context.suggestedSet.suggestions.filter((entry) => entry.role !== 'anchor-dark')

  return (
    <div className="threads-result">
      <div className="threads-comparison" aria-label="Sample and closest DMC thread">
        <div><span>Sample</span><i style={{ backgroundColor: sampleHex }} /><code>{sampleHex}</code></div>
        <svg viewBox="0 0 28 12" width="28" height="12" aria-hidden="true"><path d="M1 6h24M20 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        <div><span>Closest thread</span><i style={{ backgroundColor: primary.hex }} /><code>DMC {primary.number}</code></div>
      </div>

      <header className="threads-identity">
        <div>
          <span>{getDMCColorFamily(primary.rgb, primary.name)}</span>
          <h3>{primary.name}</h3>
        </div>
        <strong>{valueBand(primary.oklab.L)}</strong>
      </header>

      <div className="threads-fit" role="status">
        <span>{formatCatalogDeltaE00(primary.deltaE00)}</span>
        <strong>{primary.confidenceLabel}</strong>
      </div>

      {valueWarnings.length > 0 && (
        <ul className="threads-warnings">
          {valueWarnings.map((warning) => <li key={warning.code}>{warning.message}</li>)}
        </ul>
      )}

      <div className="threads-actions">
        <button type="button" className="primary" onClick={() => onColorSelect(primary.rgb)}>Highlight match</button>
        <button type="button" onClick={() => void copyCode(primary.number)}>{copiedCode === primary.number ? 'Copied' : 'Copy DMC code'}</button>
      </div>

      <details className="threads-disclosure">
        <summary>Alternative matches <span>{alternativesList.length}</span></summary>
        <ul className="threads-alternatives">
          {alternativesList.map((thread) => (
            <li key={thread.id}>
              <button type="button" onClick={() => onColorSelect(thread.rgb)}>
                <i style={{ backgroundColor: thread.hex }} aria-hidden="true" />
                <span><strong>DMC {thread.number}</strong><small>{thread.name}</small></span>
                <code>{formatCatalogDeltaE00(thread.deltaE00)}</code>
              </button>
              <button type="button" onClick={() => void copyCode(thread.number)} aria-label={`Copy DMC ${thread.number}`}>{copiedCode === thread.number ? '✓' : 'Copy'}</button>
            </li>
          ))}
        </ul>
      </details>

      <details className="threads-disclosure">
        <summary>Thread planning</summary>
        <div className="threads-planning">
          {suggestions.length > 1 && (
            <section>
              <h4>Suggested set</h4>
              <div className="threads-suggested">
                {suggestions.map((entry) => (
                  <button key={`${entry.role}-${entry.thread.id}`} type="button" onClick={() => onColorSelect(entry.thread.rgb)}>
                    <i style={{ backgroundColor: entry.thread.hex }} /><span>{entry.role === 'base' ? 'Base' : entry.role}</span><code>{entry.thread.number}</code>
                  </button>
                ))}
              </div>
            </section>
          )}

          {familyLadder.length > 1 && (
            <section>
              <h4>{primary.familyLabel} value scale</h4>
              <div className="threads-ladder">
                {familyLadder.map((thread) => <button key={thread.id} type="button" onClick={() => onColorSelect(thread.rgb)} style={{ backgroundColor: thread.hex }} aria-label={`DMC ${thread.number}, ${valueBand(thread.oklab.L)}`} />)}
              </div>
            </section>
          )}

          <ValuePreview valueBuffer={valueBuffer} valueScaleClip={valueScaleClip} sampleHex={sampleHex} />
          <p>{PICKED_COLOR_DISCLAIMER}</p>
          <p>{VALUE_ANALYSIS_NOTE}</p>
        </div>
      </details>
    </div>
  )
}

function ValuePreview({ valueBuffer, valueScaleClip, sampleHex }: { valueBuffer?: ValueBuffer | null; valueScaleClip: number; sampleHex: string }) {
  const [steps, setSteps] = useState<3 | 5 | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const thresholds = useMemo(() => valueBuffer && steps ? computeValueScale(valueBuffer.y, steps, 'Even', valueScaleClip).thresholds : null, [steps, valueBuffer, valueScaleClip])

  useEffect(() => {
    if (!valueBuffer || !thresholds || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = valueBuffer.width
    canvas.height = valueBuffer.height
    const context = canvas.getContext('2d')
    if (!context) return
    const image = context.createImageData(valueBuffer.width, valueBuffer.height)
    const count = thresholds.length - 1
    for (let index = 0; index < valueBuffer.y.length; index += 1) {
      const gray = stepToGray(getStepIndex(valueBuffer.y[index], thresholds), count)
      const offset = index * 4
      image.data[offset] = gray; image.data[offset + 1] = gray; image.data[offset + 2] = gray; image.data[offset + 3] = 255
    }
    context.putImageData(image, 0, 0)
  }, [thresholds, valueBuffer])

  if (!valueBuffer) return null
  return (
    <section className="threads-value-preview">
      <header><h4>Value grouping</h4><div><button type="button" onClick={() => setSteps(null)} className={steps === null ? 'active' : ''}>Sample</button><button type="button" onClick={() => setSteps(3)} className={steps === 3 ? 'active' : ''}>3 value</button><button type="button" onClick={() => setSteps(5)} className={steps === 5 ? 'active' : ''}>5 value</button></div></header>
      <div style={!steps ? { backgroundColor: sampleHex } : undefined}>{steps ? <canvas ref={canvasRef} /> : null}</div>
    </section>
  )
}
