export interface RGB {
  r: number
  g: number
  b: number
}

export interface ColorData {
  hex: string
  rgb: RGB
  hsl: { h: number; s: number; l: number }
  valueMetadata?: {
    y: number
    step: number
    range: [number, number]
    percentile: number
  }
}

export interface PointerCoord {
  x: number
  y: number
}

export interface CanvasCoords {
  cssX: number
  cssY: number
  canvasX: number
  canvasY: number
  dprScaleX: number
  dprScaleY: number
}

export interface ImageDrawInfo {
  x: number
  y: number
  width: number
  height: number
}
