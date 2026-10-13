/**
 * How each thing the color view says was found, in words people can check.
 * Three kinds of basis exist. Only the first two are produced today; "verified" is reserved
 * for results someone measured against real paint or thread, and nothing may claim it yet.
 */

export type Basis = 'calculated' | 'catalog' | 'verified'

export interface BasisInfo {
  basis: Basis
  /** Short chip text. */
  label: string
  /** One or two sentences: what was done to get this. */
  how: string
  /** What could make the real thing look different. */
  limits: string[]
}

export const BASIS_LABELS: Record<Basis, string> = {
  calculated: 'Calculated',
  catalog: 'Catalog match',
  verified: 'Physically verified',
}

/** Said once under every basis, because it is true of every result today. */
export const NOT_VERIFIED = 'No physical check has been done.'

export type BasisTopic = 'name' | 'relationships' | 'paint' | 'thread'

export const BASES: Record<BasisTopic, BasisInfo> = {
  name: {
    basis: 'catalog',
    label: BASIS_LABELS.catalog,
    how: 'The closest entry in a list of about 32,000 named colors. Names are a convenience, not a standard: other lists would call it something else.',
    limits: ['Different lists give different names for the same color.'],
  },
  relationships: {
    basis: 'calculated',
    label: BASIS_LABELS.calculated,
    how: 'Worked out from this color’s hue, lightness and strength on a screen color wheel (OKLCH). These are relationships between screen colors, not paint or thread matches.',
    limits: ['A painter’s color wheel is not the screen’s, so a mixing opposite can differ.', 'Your display changes how every swatch looks.'],
  },
  paint: {
    basis: 'calculated',
    label: BASIS_LABELS.calculated,
    how: 'A spectral mixing model predicts the mix on screen from the paints’ swatch colors. Nothing was mixed or measured.',
    limits: [
      'Pigment batch and brand.',
      'Paint can shift as it dries.',
      'Surface, varnish and lighting.',
    ],
  },
  thread: {
    basis: 'catalog',
    label: BASIS_LABELS.catalog,
    how: 'The nearest DMC color in our catalog. DMC does not publish color values, so ours are measured from DMC’s product photos.',
    limits: [
      'Dye lot.',
      'Sheen and the direction of the stitch.',
      'How many strands you stitch with.',
      'The color of the fabric underneath, and lighting.',
    ],
  },
}
