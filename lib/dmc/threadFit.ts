/**
 * What the thread section says about a catalog match. Bands match `getMatchConfidence`
 * (colorUtils), with CIEDE2000 language. No band says "exact": the catalog colors are
 * measured from photos, and thread is not a screen.
 */
import { formatCatalogDeltaE00, getCatalogMatchPresentation } from '../colorSemantics'
import type { ColorConfidence } from './types'

export interface ThreadFit {
  label: string
  detail: string
}

export function describeThreadFit(deltaE00: number, confidence: ColorConfidence = 'measured'): ThreadFit {
  const { label } = getCatalogMatchPresentation(deltaE00)
  const metric = formatCatalogDeltaE00(deltaE00)
  const detail = deltaE00 < 2.5
    ? `Hard to tell apart on screen (${metric}).`
    : deltaE00 < 5
      ? `Close, with a small visible difference on screen (${metric}).`
      : `Nearest available, and visibly different from this color (${metric}).`
  return {
    label,
    detail: confidence === 'approximate'
      ? `${detail} The catalog color for this thread is approximate, so it may be further off than this says.`
      : detail,
  }
}
