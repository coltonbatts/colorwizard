'use client'

/**
 * ImageCanvas - Main canvas component for image display and color sampling.
 * Refactored to use extracted sub-components and hooks for maintainability.
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import RulerOverlay from '@/components/RulerOverlay'
import { ZoomControlsBar, GridControlsPanel, ImageDropzone } from '@/components/canvas'
import { CalibrationData } from '@/lib/calibration'
import { MeasurementLayer } from '@/lib/types/measurement'
import { useImageAnalyzer } from '@/hooks/useImageAnalyzer'

interface ColorData {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  valueMetadata?: {
    y: number
    step: number
    range: [number, number]
    percentile: number
  }
}

import { rgbToLab, deltaE, rgbToHsl } from '@/lib/colorUtils'
import { ValueScaleSettings } from '@/lib/types/valueScale'
import { getStepIndex, ValueScaleResult, getRelativeLuminance, stepToGray } from '@/lib/valueScale'
import { TransformState, screenToImage } from '@/lib/calibration'
import { CanvasSettings } from '@/lib/types/canvas'

// Define RGB interface locally if not exported
interface RGB {
  r: number
  g: number
  b: number
}

interface ImageCanvasProps {
  image: HTMLImageElement | null
  onImageLoad: (img: HTMLImageElement) => void
  onColorSample: (color: ColorData) => void
  highlightColor?: RGB | null
  highlightTolerance?: number // Delta E
  highlightMode?: 'solid' | 'heatmap'
  onReset: () => void
  valueScaleSettings?: ValueScaleSettings
  onValueScaleChange?: (settings: ValueScaleSettings) => void
  onHistogramComputed?: (bins: number[]) => void
  onValueScaleResult?: (result: ValueScaleResult) => void
  canvasSettings?: CanvasSettings
  /** Enable measurement mode - when true, clicks report canvas-space coordinates */
  measureMode?: boolean
  /** Callback when a measurement click occurs (canvas-space coordinates for transform-invariant storage) */
  onMeasureClick?: (point: { x: number; y: number }) => void
  /** Callback to report current transform state (zoom and pan) for RulerOverlay */
  onTransformChange?: (transform: TransformState) => void
  /** Callback to report measurement points in IMAGE-SPACE coordinates */
  onMeasurePointsChange?: (pointA: { x: number; y: number } | null, pointB: { x: number; y: number } | null) => void
  /** Measurement specifics for RulerOverlay */
  calibration?: CalibrationData | null
  gridEnabled?: boolean
  gridSpacing?: 0.25 | 0.5 | 1 | 2
  measurePointA?: { x: number; y: number } | null
  measurePointB?: { x: number; y: number } | null
  measurementLayer?: MeasurementLayer
}

// Zoom constraints
const MIN_ZOOM = 0.1
const MAX_ZOOM = 10
const ZOOM_STEP = 0.1
const ZOOM_WHEEL_SENSITIVITY = 0.001

// Drag detection threshold (pixels)
const DRAG_THRESHOLD = 3

// Highlight overlay alpha values
const HIGHLIGHT_ALPHA_SOLID = 180
const HIGHLIGHT_ALPHA_MAX = 255

export default function ImageCanvas(props: ImageCanvasProps) {
  const { onColorSample, image, onImageLoad, valueScaleSettings } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const valueMapCanvasRef = useRef<HTMLCanvasElement>(null)

  // Use the image analyzer hook for worker-based processing
  const {
    labBuffer,
    valueBuffer,
    sortedLuminances,
    valueScaleResult: analyzerValueScaleResult,
    histogramBins,
    isAnalyzing,
  } = useImageAnalyzer(image, valueScaleSettings)

  // Use the hook's value scale result, but allow local override for settings changes
  const [localValueScaleResult, setLocalValueScaleResult] = useState<ValueScaleResult | null>(null)
  const valueScaleResult = localValueScaleResult ?? analyzerValueScaleResult

  // Report histogram and value scale to parent when they change
  useEffect(() => {
    if (histogramBins.length > 0 && props.onHistogramComputed) {
      props.onHistogramComputed(histogramBins)
    }
  }, [histogramBins, props.onHistogramComputed])

  useEffect(() => {
    if (valueScaleResult && props.onValueScaleResult) {
      props.onValueScaleResult(valueScaleResult)
    }
  }, [valueScaleResult, props.onValueScaleResult])

  // Canvas dimensions state
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1000, height: 700 })

  // View mode state
  const [isGrayscale, setIsGrayscale] = useState(false)
  const [splitMode, setSplitMode] = useState(false)

  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const lastPanPoint = useRef({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const measureStartPointRef = useRef<{ x: number; y: number } | null>(null)
  const hasDraggedRef = useRef(false)

  // Image dimensions after initial fit
  const [imageDrawInfo, setImageDrawInfo] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  // Grid system state
  const [internalGridEnabled, setInternalGridEnabled] = useState(false)
  const [gridPhysicalWidth, setGridPhysicalWidth] = useState(20)
  const [gridPhysicalHeight, setGridPhysicalHeight] = useState(16)
  const [gridSquareSize, setGridSquareSize] = useState(1)

  // Use external or internal grid enabled state
  const gridEnabled = props.gridEnabled ?? internalGridEnabled

  // Load grid settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('colorwizard_grid_settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setInternalGridEnabled(parsed.enabled ?? false)
        setGridPhysicalWidth(parsed.physicalWidth ?? 20)
        setGridPhysicalHeight(parsed.physicalHeight ?? 16)
        setGridSquareSize(parsed.squareSize ?? 1)
      } catch (e) {
        console.error('Failed to parse grid settings', e)
      }
    }
  }, [])

  // Save grid settings to localStorage
  useEffect(() => {
    localStorage.setItem('colorwizard_grid_settings', JSON.stringify({
      enabled: internalGridEnabled,
      physicalWidth: gridPhysicalWidth,
      physicalHeight: gridPhysicalHeight,
      squareSize: gridSquareSize
    }))
  }, [internalGridEnabled, gridPhysicalWidth, gridPhysicalHeight, gridSquareSize])

  // Calculate initial image fit
  const calculateImageFit = useCallback(
    (img: HTMLImageElement, canvasWidth: number, canvasHeight: number) => {
      const ratio = Math.min(canvasWidth / img.width, canvasHeight / img.height)
      const width = img.width * ratio
      const height = img.height * ratio
      const x = (canvasWidth - width) / 2
      const y = (canvasHeight - height) / 2
      return { x, y, width, height }
    },
    []
  )

  // Draw image on canvas with zoom and pan transforms
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!image || !imageDrawInfo) return

    // Save context state
    ctx.save()

    // Apply pan and zoom transforms
    ctx.translate(panOffset.x, panOffset.y)
    ctx.scale(zoomLevel, zoomLevel)

    // Draw image at the calculated fit position
    const { x, y, width, height } = imageDrawInfo

    if (splitMode && valueMapCanvasRef.current) {
      const splitX = width / 2

      // Left half: Original
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, splitX, height)
      ctx.clip()
      if (isGrayscale) ctx.filter = 'grayscale(100%)'
      ctx.drawImage(image, x, y, width, height)
      ctx.restore()

      // Right half: Value Map
      ctx.save()
      ctx.beginPath()
      ctx.rect(x + splitX, y, splitX, height)
      ctx.clip()
      ctx.drawImage(valueMapCanvasRef.current, x, y, width, height)
      ctx.restore()

      // Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 2 / zoomLevel
      ctx.beginPath()
      ctx.moveTo(x + splitX, y)
      ctx.lineTo(x + splitX, y + height)
      ctx.stroke()
    } else {
      // Normal rendering
      if (isGrayscale) ctx.filter = 'grayscale(100%)'
      ctx.drawImage(image, x, y, width, height)
      if (isGrayscale) ctx.filter = 'none'

      // Blend value map overlay on top with opacity
      if (valueScaleSettings?.enabled && valueMapCanvasRef.current) {
        const opacity = valueScaleSettings.opacity ?? 0.45
        ctx.globalAlpha = opacity
        ctx.drawImage(valueMapCanvasRef.current, x, y, width, height)
        ctx.globalAlpha = 1.0
      }
    }

    // Draw Highlight Overlay if available
    if (overlayCanvasRef.current && labBuffer?.width) {
      ctx.drawImage(
        overlayCanvasRef.current,
        imageDrawInfo.x,
        imageDrawInfo.y,
        imageDrawInfo.width,
        imageDrawInfo.height
      )
    }

    // Draw Grid
    if (gridEnabled && image) {
      const activeWidth = (props.canvasSettings?.enabled && props.canvasSettings.width) ? props.canvasSettings.width : gridPhysicalWidth
      const activeHeight = (props.canvasSettings?.enabled && props.canvasSettings.height) ? props.canvasSettings.height : gridPhysicalHeight

      const ppiDraw = imageDrawInfo.width / activeWidth

      ctx.save()
      ctx.translate(imageDrawInfo.x, imageDrawInfo.y)

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 1 / zoomLevel
      ctx.setLineDash([5 / zoomLevel, 5 / zoomLevel])

      ctx.font = `${12 / zoomLevel}px monospace`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Vertical lines (Columns)
      for (let gridX = 0; gridX <= activeWidth; gridX += gridSquareSize) {
        const xPos = gridX * ppiDraw
        ctx.beginPath()
        ctx.moveTo(xPos, 0)
        ctx.lineTo(xPos, imageDrawInfo.height)
        ctx.stroke()

        // Column label (A, B, C...)
        if (gridX < activeWidth) {
          const colLabel = String.fromCharCode(65 + Math.floor(gridX / gridSquareSize))
          ctx.fillText(colLabel, xPos + (gridSquareSize * ppiDraw) / 2, -10 / zoomLevel)
        }
      }

      // Horizontal lines (Rows)
      for (let gridY = 0; gridY <= activeHeight; gridY += gridSquareSize) {
        const yPos = gridY * ppiDraw
        ctx.beginPath()
        ctx.moveTo(0, yPos)
        ctx.lineTo(imageDrawInfo.width, yPos)
        ctx.stroke()

        // Row label (1, 2, 3...)
        if (gridY < activeHeight) {
          const rowLabel = (Math.floor(gridY / gridSquareSize) + 1).toString()
          ctx.fillText(rowLabel, -15 / zoomLevel, yPos + (gridSquareSize * ppiDraw) / 2)
        }
      }

      ctx.restore()
    }

    // Draw HUD
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transforms for HUD
    const HUD_X = 10, HUD_Y = 10, HUD_WIDTH = 180, HUD_HEIGHT = 70
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(HUD_X, HUD_Y, HUD_WIDTH, HUD_HEIGHT)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.strokeRect(HUD_X, HUD_Y, HUD_WIDTH, HUD_HEIGHT)

    ctx.fillStyle = 'white'
    ctx.font = 'bold 10px sans-serif'
    ctx.fillText('VIEW MODES', 20, 25)

    ctx.font = '9px sans-serif'
    ctx.fillStyle = valueScaleSettings?.enabled ? '#3b82f6' : '#9ca3af'
    ctx.fillText(`[V] Value Overlay: ${valueScaleSettings?.enabled ? 'ON' : 'OFF'}`, 20, 40)

    ctx.fillStyle = splitMode ? '#3b82f6' : '#9ca3af'
    ctx.fillText(`[S] Split View: ${splitMode ? 'ON' : 'OFF'}`, 20, 52)

    ctx.fillStyle = gridEnabled ? '#3b82f6' : '#9ca3af'
    ctx.fillText(`[G] Grid: ${gridEnabled ? 'ON' : 'OFF'}`, 20, 64)
    ctx.restore()

    // Restore context state
    ctx.restore()
  }, [image, imageDrawInfo, zoomLevel, panOffset, labBuffer, isGrayscale, gridEnabled, gridPhysicalWidth, gridPhysicalHeight, gridSquareSize, valueScaleSettings?.enabled, valueScaleSettings?.opacity, valueScaleResult, splitMode, props.canvasSettings])

  // Resize observer to update canvas dimensions when container resizes
  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    if (!canvasContainer) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasDimensions({
          width: Math.floor(width),
          height: Math.floor(height),
        })
      }
    })

    resizeObserver.observe(canvasContainer)
    return () => resizeObserver.disconnect()
  }, [image])

  // Update image draw info when image or canvas dimensions change
  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current
      const info = calculateImageFit(image, canvas.width, canvas.height)
      setImageDrawInfo(info)
      // Reset zoom and pan when new image loads or canvas resizes
      setZoomLevel(1)
      setPanOffset({ x: 0, y: 0 })
    }
  }, [image, canvasDimensions, calculateImageFit])

  // Redraw canvas when zoom, pan, or image changes
  useEffect(() => {
    drawCanvas()
  }, [drawCanvas, props.highlightMode, props.highlightColor, props.highlightTolerance])

  // Report transform state changes to parent for RulerOverlay
  useEffect(() => {
    if (props.onTransformChange && imageDrawInfo) {
      props.onTransformChange({ zoomLevel, panOffset, imageDrawInfo })
    }
  }, [zoomLevel, panOffset, imageDrawInfo, props.onTransformChange])

  // Zoom function centered on a point
  const zoomAtPoint = useCallback(
    (newZoom: number, centerX: number, centerY: number) => {
      const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom))
      const zoomRatio = clampedZoom / zoomLevel

      // Adjust pan to keep the point under cursor stationary
      const newPanX = centerX - (centerX - panOffset.x) * zoomRatio
      const newPanY = centerY - (centerY - panOffset.y) * zoomRatio

      setZoomLevel(clampedZoom)
      setPanOffset({ x: newPanX, y: newPanY })
    },
    [zoomLevel, panOffset]
  )

  // Handle mouse wheel for zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!image) return
      e.preventDefault()

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      const cursorX = (e.clientX - rect.left) * scaleX
      const cursorY = (e.clientY - rect.top) * scaleY

      const delta = -e.deltaY * ZOOM_WHEEL_SENSITIVITY
      const newZoom = zoomLevel * (1 + delta)

      zoomAtPoint(newZoom, cursorX, cursorY)
    },
    [image, zoomLevel, zoomAtPoint]
  )

  // Add wheel event listener
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!image) return

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpaceDown(true)
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        const canvas = canvasRef.current
        if (canvas) {
          zoomAtPoint(zoomLevel + ZOOM_STEP, canvas.width / 2, canvas.height / 2)
        }
      }

      if (e.key === '-') {
        e.preventDefault()
        const canvas = canvasRef.current
        if (canvas) {
          zoomAtPoint(zoomLevel - ZOOM_STEP, canvas.width / 2, canvas.height / 2)
        }
      }

      if (e.key === '0') {
        e.preventDefault()
        resetView()
      }

      if (e.key.toLowerCase() === 'v' && !e.repeat) {
        if (props.onValueScaleChange && props.valueScaleSettings) {
          props.onValueScaleChange({
            ...props.valueScaleSettings,
            enabled: !props.valueScaleSettings.enabled
          })
        }
      }

      if (e.key.toLowerCase() === 's' && !e.repeat) {
        setSplitMode(prev => !prev)
      }

      if (e.key.toLowerCase() === 'g' && !e.repeat) {
        setInternalGridEnabled(prev => !prev)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false)
        setIsPanning(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [image, zoomLevel, zoomAtPoint, props.onValueScaleChange, props.valueScaleSettings])

  // Reset view to initial state
  const resetView = useCallback(() => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  const sampleColor = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY

    const pixelData = ctx.getImageData(Math.floor(canvasX), Math.floor(canvasY), 1, 1).data
    const r = pixelData[0]
    const g = pixelData[1]
    const b = pixelData[2]

    if (pixelData[3] === 0) return

    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
    const hsl = rgbToHsl(r, g, b)

    let valueMetadata = undefined
    if (valueScaleResult) {
      const y = getRelativeLuminance(r, g, b)
      const stepIdx = getStepIndex(y, valueScaleResult.thresholds)
      const step = valueScaleResult.steps[stepIdx]

      let percentile = 0
      if (sortedLuminances) {
        let low = 0
        let high = sortedLuminances.length - 1
        while (low <= high) {
          const mid = (low + high) >> 1
          if (sortedLuminances[mid] < y) {
            low = mid + 1
          } else {
            high = mid - 1
          }
        }
        percentile = low / sortedLuminances.length
      }

      valueMetadata = {
        y,
        step: stepIdx + 1,
        range: [step.min, step.max] as [number, number],
        percentile
      }
    }

    onColorSample({
      hex,
      rgb: { r, g, b },
      hsl,
      valueMetadata
    })
  }, [image, valueScaleResult, sortedLuminances, onColorSample])

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const screenX = (e.clientX - rect.left) * scaleX
    const screenY = (e.clientY - rect.top) * scaleY

    // Measurement Mode
    if (props.measureMode && e.button === 0 && !isSpaceDown) {
      const imagePoint = screenToImage(screenX, screenY, { zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined }, image.width, image.height)
      if (imagePoint && props.onMeasurePointsChange) {
        setIsMeasuring(true)
        measureStartPointRef.current = imagePoint
        props.onMeasurePointsChange(imagePoint, imagePoint)
      }
      return
    }

    // Panning Mode
    if (e.button === 0 || e.button === 1 || isSpaceDown) {
      e.preventDefault()
      setIsPanning(true)
      lastPanPoint.current = { x: e.clientX, y: e.clientY }
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      hasDraggedRef.current = false
    }
  }

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const screenX = (e.clientX - rect.left) * scaleX
    const screenY = (e.clientY - rect.top) * scaleY

    // Measurement Drag Preview
    if (isMeasuring && props.onMeasurePointsChange && measureStartPointRef.current) {
      const imagePoint = screenToImage(screenX, screenY, { zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined }, image.width, image.height)
      if (imagePoint) {
        props.onMeasurePointsChange(measureStartPointRef.current, imagePoint)
      }
      return
    }

    if (isPanning) {
      if (!hasDraggedRef.current) {
        const dist = Math.hypot(
          e.clientX - dragStartRef.current.x,
          e.clientY - dragStartRef.current.y
        )
        if (dist > DRAG_THRESHOLD) hasDraggedRef.current = true
      }

      const deltaX = (e.clientX - lastPanPoint.current.x) * scaleX
      const deltaY = (e.clientY - lastPanPoint.current.y) * scaleY

      setPanOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }))

      lastPanPoint.current = { x: e.clientX, y: e.clientY }
    }
  }

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMeasuring) {
      setIsMeasuring(false)
      return
    }

    setIsPanning(false)
    if (e.button === 0 && !hasDraggedRef.current && !isSpaceDown) {
      if (props.measureMode && props.onMeasureClick) {
        const canvas = canvasRef.current
        if (!canvas || !image) return

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        const screenX = (e.clientX - rect.left) * scaleX
        const screenY = (e.clientY - rect.top) * scaleY

        const imagePoint = screenToImage(screenX, screenY, { zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined }, image.width, image.height)
        if (imagePoint) {
          props.onMeasureClick(imagePoint)
        }
      } else {
        sampleColor(e)
      }
    }
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsPanning(false)
  }

  // Draw value map overlay
  useEffect(() => {
    const canvas = valueMapCanvasRef.current
    const enabled = valueScaleSettings?.enabled
    if (!canvas || !valueBuffer || !enabled || !valueScaleResult) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== valueBuffer.width || canvas.height !== valueBuffer.height) {
      canvas.width = valueBuffer.width
      canvas.height = valueBuffer.height
    }

    const imageData = ctx.createImageData(valueBuffer.width, valueBuffer.height)
    const data = imageData.data
    const { y: yBuffer } = valueBuffer
    const pixelCount = yBuffer.length

    const thresholds = valueScaleResult.thresholds
    const numSteps = thresholds.length - 1

    for (let i = 0; i < pixelCount; i++) {
      const y = yBuffer[i]
      const stepIdx = getStepIndex(y, thresholds)
      const val = stepToGray(stepIdx, numSteps)

      const idx = i * 4
      data[idx] = val
      data[idx + 1] = val
      data[idx + 2] = val
      data[idx + 3] = 255
    }

    ctx.putImageData(imageData, 0, 0)
  }, [valueBuffer, valueScaleSettings?.enabled, valueScaleResult])

  // Draw highlight overlay
  useEffect(() => {
    const { highlightColor, highlightTolerance = 20, highlightMode = 'solid' } = props
    const canvas = overlayCanvasRef.current
    if (!canvas || !labBuffer || !highlightColor) {
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== labBuffer.width || canvas.height !== labBuffer.height) {
      canvas.width = labBuffer.width
      canvas.height = labBuffer.height
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const targetLab = rgbToLab(highlightColor.r, highlightColor.g, highlightColor.b)
    const imageData = ctx.createImageData(labBuffer.width, labBuffer.height)
    const data = imageData.data

    const { l: lBuffer, a: aBuffer, b: bBuffer } = labBuffer
    const pixelCount = lBuffer.length

    for (let i = 0; i < pixelCount; i++) {
      const currentLab = { mode: 'lab' as const, l: lBuffer[i], a: aBuffer[i], b: bBuffer[i] }
      const dist = deltaE(currentLab, targetLab)

      if (dist <= highlightTolerance) {
        const idx = i * 4
        if (highlightMode === 'solid') {
          data[idx] = 255
          data[idx + 1] = 0
          data[idx + 2] = 255
          data[idx + 3] = HIGHLIGHT_ALPHA_SOLID
        } else {
          const strength = 1 - (dist / highlightTolerance)
          data[idx] = 255
          data[idx + 1] = Math.floor(255 * (1 - strength))
          data[idx + 2] = 0
          data[idx + 3] = Math.min(HIGHLIGHT_ALPHA_MAX, Math.floor(HIGHLIGHT_ALPHA_MAX * strength * 1.5))
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)

  }, [labBuffer, props.highlightColor, props.highlightTolerance, props.highlightMode])

  // Zoom control handlers
  const handleZoomIn = () => {
    const canvas = canvasRef.current
    if (canvas) {
      zoomAtPoint(zoomLevel + ZOOM_STEP, canvas.width / 2, canvas.height / 2)
    }
  }

  const handleZoomOut = () => {
    const canvas = canvasRef.current
    if (canvas) {
      zoomAtPoint(zoomLevel - ZOOM_STEP, canvas.width / 2, canvas.height / 2)
    }
  }

  // Get cursor style based on current mode
  const getCursorStyle = () => {
    if (isPanning) return 'grabbing'
    if (isSpaceDown) return 'grab'
    return 'crosshair'
  }

  return (
    <div className="h-full flex flex-col" ref={containerRef}>
      <h1 className="text-3xl font-bold mb-6 text-gray-100">Color Wizard</h1>

      {!image ? (
        <ImageDropzone onImageLoad={onImageLoad} />
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Zoom Controls Bar */}
          <ZoomControlsBar
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFit={resetView}
            isGrayscale={isGrayscale}
            onToggleGrayscale={() => setIsGrayscale(!isGrayscale)}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
          />

          {/* Grid Controls */}
          <GridControlsPanel
            gridEnabled={internalGridEnabled}
            onToggleGrid={setInternalGridEnabled}
            physicalWidth={gridPhysicalWidth}
            physicalHeight={gridPhysicalHeight}
            onDimensionsChange={(w, h) => {
              setGridPhysicalWidth(w)
              setGridPhysicalHeight(h)
            }}
            squareSize={gridSquareSize}
            onSquareSizeChange={setGridSquareSize}
          />

          {/* Canvas Container */}
          <div
            ref={canvasContainerRef}
            className="flex-1 relative overflow-hidden rounded-lg border border-gray-700 bg-gray-900"
          >
            {/* Loading indicator */}
            {isAnalyzing && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2 text-xs text-white/70 bg-gray-900/80 px-2 py-1 rounded">
                <div className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            )}

            <canvas
              ref={canvasRef}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute top-0 left-0 w-full h-full"
              style={{ cursor: getCursorStyle() }}
            />

            {/* Highlight Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ display: 'none' }}
            />
            <canvas ref={valueMapCanvasRef} id="value-map-canvas" style={{ display: 'none' }} />

            {/* Ruler Grid & Measurement Overlay */}
            <RulerOverlay
              gridEnabled={props.gridEnabled || false}
              gridSpacing={props.gridSpacing || 1}
              calibration={props.calibration || null}
              measureEnabled={props.measureMode || false}
              measurePointA={props.measurePointA}
              measurePointB={props.measurePointB}
              containerRef={canvasContainerRef}
              onMeasurePointsChange={props.onMeasurePointsChange}
              transformState={{ zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined }}
              measurementLayer={props.measurementLayer}
              image={image}
              canvasSettings={props.canvasSettings}
            />
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={props.onReset}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              Load New Image
            </button>
            <div className="text-gray-500 text-sm">
              Zoom: {Math.round(zoomLevel * 100)}% | Pan: ({Math.round(panOffset.x)}, {Math.round(panOffset.y)})
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
