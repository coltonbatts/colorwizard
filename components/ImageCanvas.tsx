'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

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

import { rgbToLab, deltaE, Lab } from '@/lib/colorUtils'
import { getLuminance } from '@/lib/paintingMath'
import { ValueScaleSettings } from '@/lib/types/valueScale'
import { computeValueScale, getStepIndex, ValueScaleResult, getRelativeLuminance, stepToGray, computeHistogram } from '@/lib/valueScale'
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
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 10
const ZOOM_STEP = 0.1
const ZOOM_WHEEL_SENSITIVITY = 0.001

export default function ImageCanvas(props: ImageCanvasProps) {
  const { onColorSample, image, onImageLoad, valueScaleSettings } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  // Internal image state removed in favor of prop
  const [isDragging, setIsDragging] = useState(false)

  // Highlight system state
  const [labBuffer, setLabBuffer] = useState<{ l: Float32Array; a: Float32Array; b: Float32Array; width: number; height: number } | null>(null)
  const [valueBuffer, setValueBuffer] = useState<{ y: Float32Array; width: number; height: number } | null>(null)
  const [sortedLuminances, setSortedLuminances] = useState<Float32Array | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const valueMapCanvasRef = useRef<HTMLCanvasElement>(null)

  // Canvas dimensions state
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1000, height: 700 })
  // Value Map state
  const [valueScaleResult, setValueScaleResult] = useState<ValueScaleResult | null>(null)
  const [rangeHighlightMin, setRangeHighlightMin] = useState(0)
  const [rangeHighlightMax, setRangeHighlightMax] = useState(100)
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
  const [gridEnabled, setGridEnabled] = useState(false)
  const [gridPhysicalWidth, setGridPhysicalWidth] = useState(20)
  const [gridPhysicalHeight, setGridPhysicalHeight] = useState(16)
  const [gridSquareSize, setGridSquareSize] = useState(1)

  // Load grid settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('colorwizard_grid_settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setGridEnabled(parsed.enabled ?? false)
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
      enabled: gridEnabled,
      physicalWidth: gridPhysicalWidth,
      physicalHeight: gridPhysicalHeight,
      squareSize: gridSquareSize
    }))
  }, [gridEnabled, gridPhysicalWidth, gridPhysicalHeight, gridSquareSize])

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
    // First translate to pan offset, then scale for zoom
    ctx.translate(panOffset.x, panOffset.y)
    ctx.scale(zoomLevel, zoomLevel)

    // Draw image at the calculated fit position
    // Always draw original image first, then overlay value map with opacity if enabled
    const renderImage = () => {
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
          ctx.drawImage(
            valueMapCanvasRef.current,
            x,
            y,
            width,
            height
          )
          ctx.globalAlpha = 1.0
        }
      }
    }
    renderImage()

    // Draw Highlight Overlay if available
    if (overlayCanvasRef.current && labBuffer?.width) {
      // We draw the overlay canvas (which is at buffer resolution)
      // onto the main canvas at the same screen coordinates as the image.
      // Context is already transformed for zoom/pan.
      ctx.drawImage(
        overlayCanvasRef.current,
        imageDrawInfo.x,
        imageDrawInfo.y,
        imageDrawInfo.width,
        imageDrawInfo.height
      )
    }

    // Draw Grid
    if (gridEnabled) {
      const activeWidth = (props.canvasSettings?.enabled && props.canvasSettings.width) ? props.canvasSettings.width : gridPhysicalWidth
      const activeHeight = (props.canvasSettings?.enabled && props.canvasSettings.height) ? props.canvasSettings.height : gridPhysicalHeight

      const ppi = image.width / activeWidth
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
      for (let x = 0; x <= activeWidth; x += gridSquareSize) {
        const xPos = x * ppiDraw
        ctx.beginPath()
        ctx.moveTo(xPos, 0)
        ctx.lineTo(xPos, imageDrawInfo.height)
        ctx.stroke()

        // Column label (A, B, C...)
        if (x < activeWidth) {
          const colLabel = String.fromCharCode(65 + Math.floor(x / gridSquareSize))
          ctx.fillText(colLabel, xPos + (gridSquareSize * ppiDraw) / 2, -10 / zoomLevel)
        }
      }

      // Horizontal lines (Rows)
      for (let y = 0; y <= activeHeight; y += gridSquareSize) {
        const yPos = y * ppiDraw
        ctx.beginPath()
        ctx.moveTo(0, yPos)
        ctx.lineTo(imageDrawInfo.width, yPos)
        ctx.stroke()

        // Row label (1, 2, 3...)
        if (y < activeHeight) {
          const rowLabel = (Math.floor(y / gridSquareSize) + 1).toString()
          ctx.fillText(rowLabel, -15 / zoomLevel, yPos + (gridSquareSize * ppiDraw) / 2)
        }
      }

      ctx.restore()
    }

    // Draw HUD
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transforms for HUD
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(10, 10, 180, 70)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.strokeRect(10, 10, 180, 70)

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
  }, [image, imageDrawInfo, zoomLevel, panOffset, labBuffer, isGrayscale, gridEnabled, gridPhysicalWidth, gridPhysicalHeight, gridSquareSize, valueScaleSettings?.enabled, valueScaleSettings?.opacity, valueScaleResult, splitMode]) // Updated deps

  // Resize observer to update canvas dimensions when container resizes
  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    if (!canvasContainer) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        // Update canvas dimensions based on container size
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

      // Get cursor position in canvas coordinates
      const cursorX = (e.clientX - rect.left) * scaleX
      const cursorY = (e.clientY - rect.top) * scaleY

      // Calculate zoom delta
      const delta = -e.deltaY * ZOOM_WHEEL_SENSITIVITY
      const newZoom = zoomLevel * (1 + delta)

      zoomAtPoint(newZoom, cursorX, cursorY)
    },
    [image, zoomLevel, zoomAtPoint]
  )

  // Add wheel event listener (passive: false required for preventDefault)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Handle keyboard events for pan mode and zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!image) return

      // Spacebar for pan mode
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpaceDown(true)
      }

      // + / = for zoom in
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        const canvas = canvasRef.current
        if (canvas) {
          const centerX = canvas.width / 2
          const centerY = canvas.height / 2
          zoomAtPoint(zoomLevel + ZOOM_STEP, centerX, centerY)
        }
      }

      // - for zoom out
      if (e.key === '-') {
        e.preventDefault()
        const canvas = canvasRef.current
        if (canvas) {
          const centerX = canvas.width / 2
          const centerY = canvas.height / 2
          zoomAtPoint(zoomLevel - ZOOM_STEP, centerX, centerY)
        }
      }

      // 0 to reset view
      if (e.key === '0') {
        e.preventDefault()
        resetView()
      }

      // V for Value Scale Toggle
      if (e.key.toLowerCase() === 'v' && !e.repeat) {
        if (props.onValueScaleChange && props.valueScaleSettings) {
          props.onValueScaleChange({
            ...props.valueScaleSettings,
            enabled: !props.valueScaleSettings.enabled
          })
        }
      }

      // S for Split Mode Toggle
      if (e.key.toLowerCase() === 's' && !e.repeat) {
        setSplitMode(prev => !prev)
      }

      // G for Grid Toggle
      if (e.key.toLowerCase() === 'g' && !e.repeat) {
        setGridEnabled(prev => !prev)
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
  }, [image, zoomLevel, zoomAtPoint])

  // Reset view to initial state
  const resetView = useCallback(() => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  // Fit to view
  const fitToView = useCallback(() => {
    resetView()
  }, [resetView])

  const sampleColor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    // Convert screen coordinates to canvas coordinates
    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY

    // Get pixel data from the transformed canvas
    const pixelData = ctx.getImageData(
      Math.floor(canvasX),
      Math.floor(canvasY),
      1,
      1
    ).data
    const r = pixelData[0]
    const g = pixelData[1]
    const b = pixelData[2]

    // Check if we clicked on the image (not the background)
    if (pixelData[3] === 0) return

    // Convert to hex
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`

    // Convert to HSL
    const hsl = rgbToHsl(r, g, b)

    // Value Metadata
    let valueMetadata = undefined
    if (valueScaleResult) {
      const y = getRelativeLuminance(r, g, b)
      const stepIdx = getStepIndex(y, valueScaleResult.thresholds)
      const step = valueScaleResult.steps[stepIdx]

      let percentile = 0
      if (sortedLuminances) {
        // Binary search for approximate percentile rank
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
  }

  // Handle mouse down for panning or measurement
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
        props.onMeasurePointsChange(imagePoint, imagePoint) // Start with both points at same position
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

  // Handle mouse move for panning or measurement preview
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
      // Check for drag threshold
      if (!hasDraggedRef.current) {
        const dist = Math.hypot(
          e.clientX - dragStartRef.current.x,
          e.clientY - dragStartRef.current.y
        )
        if (dist > 3) hasDraggedRef.current = true
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

  // Handle mouse up to stop panning or measurement
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMeasuring) {
      setIsMeasuring(false)
      return
    }

    setIsPanning(false)
    if (e.button === 0 && !hasDraggedRef.current && !isSpaceDown) {
      // Check if measurement mode is active (single click fallback)
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

  // Handle mouse leave to stop panning
  const handleMouseLeave = () => {
    setIsPanning(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      loadImage(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      loadImage(file)
    }
  }

  const loadImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        onImageLoad(img)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Pre-calculate Lab and Value values for the image for fast comparison
  useEffect(() => {
    if (!image) {
      setLabBuffer(null)
      setValueBuffer(null)
      return
    }

    // Create a temporary canvas to read pixel data
    const canvas = document.createElement('canvas')
    // Limit processing resolution for performance (max 1000px longest side)
    const MAX_PROCESS_DIM = 1000
    let width = image.width
    let height = image.height

    if (width > MAX_PROCESS_DIM || height > MAX_PROCESS_DIM) {
      const ratio = Math.min(MAX_PROCESS_DIM / width, MAX_PROCESS_DIM / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(image, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    const pixelCount = width * height

    const lBuffer = new Float32Array(pixelCount)
    const aBuffer = new Float32Array(pixelCount)
    const bBuffer = new Float32Array(pixelCount)
    const yBuffer = new Float32Array(pixelCount)

    // Process pixels
    // NOTE: This could be moved to a Web Worker if it blocks the UI too much
    for (let i = 0; i < pixelCount; i++) {
      const r = data[i * 4]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]

      const lab = rgbToLab(r, g, b)
      lBuffer[i] = lab.l
      aBuffer[i] = lab.a
      bBuffer[i] = lab.b

      yBuffer[i] = getRelativeLuminance(r, g, b)
    }

    setLabBuffer({
      l: lBuffer,
      a: aBuffer,
      b: bBuffer,
      width,
      height
    })

    setValueBuffer({
      y: yBuffer,
      width,
      height
    })

    const sorted = new Float32Array(yBuffer).sort()
    setSortedLuminances(sorted)

    // Compute histogram
    const bins = computeHistogram(yBuffer)
    if (props.onHistogramComputed) props.onHistogramComputed(bins)

    // Compute initial value scale
    const result = computeValueScale(yBuffer, valueScaleSettings?.steps || 5, valueScaleSettings?.mode || 'Even', valueScaleSettings?.clip || 0)
    setValueScaleResult(result)
    if (props.onValueScaleResult) props.onValueScaleResult(result)
  }, [image, valueScaleSettings])

  // Re-compute value scale result when settings change
  useEffect(() => {
    if (!valueBuffer) return
    const result = computeValueScale(valueBuffer.y, valueScaleSettings?.steps || 5, valueScaleSettings?.mode || 'Even', valueScaleSettings?.clip || 0)
    setValueScaleResult(result)
    if (props.onValueScaleResult) props.onValueScaleResult(result)
  }, [valueScaleSettings, valueBuffer])

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

      // Use stepToGray for consistent quantization across overlay and hero readout
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
      // Clear overlay if no highlight
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Resize overlay canvas to match the buffer dimensions
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
      // Must match culori Lab interface with mode property
      const currentLab = { mode: 'lab', l: lBuffer[i], a: aBuffer[i], b: bBuffer[i] } as unknown as Lab
      const dist = deltaE(currentLab, targetLab)

      if (dist <= highlightTolerance) {
        const idx = i * 4
        // Color overlay based on mode
        if (highlightMode === 'solid') {
          // Vivid pink/magenta for high visibility default
          data[idx] = 255     // R
          data[idx + 1] = 0   // G
          data[idx + 2] = 255 // B
          data[idx + 3] = 180 // Alpha
        } else {
          // Heatmap: Closer match = more opaque / intense
          // Scale alpha from 255 (dist=0) to 0 (dist=tolerance)
          const strength = 1 - (dist / highlightTolerance)
          data[idx] = 255
          data[idx + 1] = Math.floor(255 * (1 - strength)) // G goes 0->255 (Red -> White/Yellowish)
          data[idx + 2] = 0
          data[idx + 3] = Math.min(255, Math.floor(255 * strength * 1.5))
        }
      } else {
        // Optional: Dim non-matching areas? 
        // For now, transparent. User can see original image underneath.
      }
    }

    ctx.putImageData(imageData, 0, 0)

  }, [labBuffer, props.highlightColor, props.highlightTolerance, props.highlightMode])

  /**
   * Converts RGB color values to HSL (Hue, Saturation, Lightness) color space.
   *
   * RGB (Red, Green, Blue) represents colors as combinations of red, green, and blue light,
   * with values ranging from 0-255. HSL represents colors in terms of:
   * - Hue: The color type (red, yellow, green, blue, etc.) as a degree on the color wheel (0-360)
   * - Saturation: The intensity/purity of the color as a percentage (0-100)
   * - Lightness: How light or dark the color is as a percentage (0-100)
   *
   * HSL is often more intuitive for color manipulation and analysis because it separates
   * the color information (hue) from the brightness (lightness) and intensity (saturation).
   *
   * @param {number} r - Red component (0-255)
   * @param {number} g - Green component (0-255)
   * @param {number} b - Blue component (0-255)
   *
   * @returns {Object} HSL color representation
   * @returns {number} returns.h - Hue in degrees (0-360)
   * @returns {number} returns.s - Saturation percentage (0-100)
   * @returns {number} returns.l - Lightness percentage (0-100)
   *
   * @example
   * // Convert pure red to HSL
   * const hsl = rgbToHsl(255, 0, 0)
   * // Returns: { h: 0, s: 100, l: 50 }
   *
   * @example
   * // Convert a gray color to HSL
   * const hsl = rgbToHsl(128, 128, 128)
   * // Returns: { h: 0, s: 0, l: 50 }
   *
   * @example
   * // Convert a sky blue to HSL
   * const hsl = rgbToHsl(135, 206, 235)
   * // Returns: { h: 197, s: 71, l: 73 }
   *
   * @remarks
   * - This implementation uses the standard HSL conversion algorithm
   * - All return values are rounded to the nearest integer for practical use
   * - When saturation is 0 (achromatic/gray), the hue value is meaningless and set to 0
   * - The algorithm normalizes RGB values to 0-1 range before calculation
   */
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    }
  }



  // Zoom control handlers
  const handleZoomIn = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      zoomAtPoint(zoomLevel + ZOOM_STEP, centerX, centerY)
    }
  }

  const handleZoomOut = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      zoomAtPoint(zoomLevel - ZOOM_STEP, centerX, centerY)
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
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 bg-gray-800/50'
            }`}
        >
          <div className="text-center">
            <p className="text-xl text-gray-400 mb-4">
              Drop an image here or click to browse
            </p>
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white inline-block transition-colors">
                Choose Image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Zoom Controls Bar */}
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= MIN_ZOOM}
                className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-white transition-colors text-lg font-bold"
                title="Zoom Out (-)"
              >
                −
              </button>
              <div className="w-20 text-center text-gray-300 text-sm font-mono">
                {Math.round(zoomLevel * 100)}%
              </div>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= MAX_ZOOM}
                className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-white transition-colors text-lg font-bold"
                title="Zoom In (+)"
              >
                +
              </button>
              <button
                onClick={fitToView}
                className="px-3 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
                title="Reset View (0)"
              >
                Fit
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGrayscale(!isGrayscale)}
                className={`px-3 h-8 flex items-center justify-center rounded text-sm transition-colors ${isGrayscale
                  ? 'bg-blue-600 text-white hover:bg-blue-600/80'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                title="Toggle Grayscale"
              >
                Gray
              </button>
            </div>
            <div className="text-gray-500 text-xs">
              Scroll/± to Zoom • Space+Drag to Pan • 0 to Fit • Click to Sample
            </div>
          </div>

          {/* Grid Controls */}
          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 mb-4 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={gridEnabled}
                onChange={(e) => setGridEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-200 font-medium">Grid Overlay</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">Canvas:</span>
              <input
                type="number"
                value={gridPhysicalWidth}
                onChange={(e) => setGridPhysicalWidth(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-200 focus:border-blue-500 outline-none"
                min="1"
              />
              <span className="text-gray-500">×</span>
              <input
                type="number"
                value={gridPhysicalHeight}
                onChange={(e) => setGridPhysicalHeight(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-200 focus:border-blue-500 outline-none"
                min="1"
              />
              <span className="text-gray-500">in</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">Size:</span>
              <select
                value={gridSquareSize}
                onChange={(e) => setGridSquareSize(Number(e.target.value))}
                className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-200 focus:border-blue-500 outline-none"
              >
                <option value="0.25">0.25"</option>
                <option value="0.5">0.5"</option>
                <option value="1">1"</option>
                <option value="2">2"</option>
                <option value="3">3"</option>
              </select>
            </div>
          </div>

          {/* Canvas Container */}
          <div
            ref={canvasContainerRef}
            className="flex-1 relative overflow-hidden rounded-lg border border-gray-700 bg-gray-900"
          >
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
              style={{
                // We need to apply the same transform as the main image
                // But since the overlay is generated at buffer size (potentially diff from image.naturalSize), 
                // we need to be careful.
                // Actually easier strategy: Render overlay at 'buffer' size, but use CSS transform to align?
                // Or better: Draw the overlay INTO the main canvas context?
                // No, separate canvas is better for performance (don't redraw base image constantly).

                // Let's position it exactly like the main image using the same `imageDrawInfo`
                // logic, simply drawing it with CSS width/height?
                // The overlayCanvas has resolution `labBuffer.width` x `labBuffer.height`.
                // We want it to occupy `imageDrawInfo.x`, `imageDrawInfo.y` with size `imageDrawInfo.width` x `imageDrawInfo.height`
                // AND be affected by the parent zoom/pan which is on the context?

                // Wait, the main canvas uses context transforms (ctx.translate/scale).
                // The main canvas is full size of container.
                // We should probably draw the overlay onto the MAIN canvas in `drawCanvas`?
                // Pros: Perfect sync with zoom/pan. Cons: Re-uploading texture every frame?
                // Actually `putImageData` is slow. Creating an ImageBitmap from the overlay canvas and drawing that is fast.
                display: 'none' // We will draw this separate canvas onto the main canvas
              }}
            />
            <canvas ref={valueMapCanvasRef} id="value-map-canvas" style={{ display: 'none' }} />
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
        </div >
      )
      }
    </div >
  )
}
