/**
 * CanvasSection.tsx - Extracted canvas and drawing components
 * Improves component reusability and enables code splitting
 */

'use client'

import { useRef, useCallback } from 'react'
import ImageCanvas from '@/components/ImageCanvas'
import ErrorBoundary from '@/components/ErrorBoundary'
import { CanvasErrorFallback } from '@/components/errors/CanvasErrorFallback'
import { CalibrationData, TransformState } from '@/lib/calibration'
import { CanvasSettings } from '@/lib/types/canvas'
import { ValueScaleSettings } from '@/lib/types/valueScale'

interface Point {
  x: number
  y: number
}

interface CanvasSectionProps {
  image: HTMLImageElement | null
  onImageLoad: (img: HTMLImageElement) => void
  onReset: () => void
  onColorSample: (color: {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
  }) => void
  highlightColor: { r: number; g: number; b: number } | null
  highlightTolerance: number
  highlightMode: 'solid' | 'heatmap'
  valueScaleSettings: ValueScaleSettings
  onValueScaleChange: (settings: ValueScaleSettings) => void
  onHistogramComputed: (bins: number[]) => void
  onValueScaleResult: (result: any) => void
  measureMode: boolean
  onMeasurePointsChange: (a: Point | null, b: Point | null) => void
  onTransformChange: (state: TransformState) => void
  calibration: CalibrationData | null
  gridEnabled: boolean
  gridSpacing: 0.25 | 0.5 | 1 | 2
  measurePointA: Point | null
  measurePointB: Point | null
  measurementLayer: 'reference' | 'painting'
  canvasSettings: CanvasSettings
}

export default function CanvasSection({
  image,
  onImageLoad,
  onReset,
  onColorSample,
  highlightColor,
  highlightTolerance,
  highlightMode,
  valueScaleSettings,
  onValueScaleChange,
  onHistogramComputed,
  onValueScaleResult,
  measureMode,
  onMeasurePointsChange,
  onTransformChange,
  calibration,
  gridEnabled,
  gridSpacing,
  measurePointA,
  measurePointB,
  measurementLayer,
  canvasSettings,
}: CanvasSectionProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex-1 min-h-0 relative" ref={canvasContainerRef}>
      <ErrorBoundary
        fallback={({ resetError }) => (
          <CanvasErrorFallback
            resetError={resetError}
            onReset={onReset}
          />
        )}
      >
        <ImageCanvas
          image={image}
          onImageLoad={onImageLoad}
          onReset={onReset}
          onColorSample={onColorSample}
          highlightColor={highlightColor}
          highlightTolerance={highlightTolerance}
          highlightMode={highlightMode}
          valueScaleSettings={valueScaleSettings}
          onValueScaleChange={onValueScaleChange}
          onHistogramComputed={onHistogramComputed}
          onValueScaleResult={onValueScaleResult}
          measureMode={measureMode}
          onMeasurePointsChange={onMeasurePointsChange}
          onTransformChange={onTransformChange}
          calibration={calibration}
          gridEnabled={gridEnabled}
          gridSpacing={gridSpacing}
          measurePointA={measurePointA}
          measurePointB={measurePointB}
          measurementLayer={measurementLayer}
          canvasSettings={canvasSettings}
        />
      </ErrorBoundary>
    </div>
  )
}
