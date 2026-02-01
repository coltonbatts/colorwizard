'use client'

/**
 * ImageCanvas - Main canvas component for image display and color sampling.
 * Refactored to use extracted sub-components and hooks for maintainability.
 */

import { useRef, useState, useEffect, useCallback, useMemo, useId } from 'react'
import RulerOverlay from '@/components/RulerOverlay'
import { ZoomControlsBar, GridControlsPanel, ImageDropzone, NavigatorMinimap } from '@/components/canvas'
import { CalibrationData } from '@/lib/calibration'
import { MeasurementLayer } from '@/lib/types/measurement'
import { useImageAnalyzer } from '@/hooks/useImageAnalyzer'
import type { BreakdownStep } from '@/components/ProcessSlider'
import { useStore } from '@/lib/store/useStore'
import FullScreenOverlay from '@/components/FullScreenOverlay'
import { createSourceBuffer } from '@/lib/imagePipeline'
import { DebugOverlay } from '@/components/DebugOverlay'

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

import { rgbToHsl } from '@/lib/colorUtils'
import { ValueScaleSettings } from '@/lib/types/valueScale'
import { getStepIndex, ValueScaleResult, getRelativeLuminance, stepToGray } from '@/lib/valueScale'
// Define RGB interface locally if not exported
import { TransformState, screenToImage } from '@/lib/calibration'
import { CanvasSettings as AppCanvasSettings } from '@/lib/types/canvas'
import { calculateFit } from '@/lib/canvasRendering'

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
  canvasSettings?: AppCanvasSettings
  /** Enable measurement mode - when true, clicks report canvas-space coordinates */
  measureMode?: boolean
  /** Callback when a measurement click occurs (canvas-space coordinates for transform-invariant storage) */
  onMeasureClick?: (point: { x: number; y: number }) => void
  /** Callback to report current transform state (zoom and pan) for RulerOverlay */
  onTransformChange?: (transform: TransformState) => void
  /** Callback to report measurement points in IMAGE-SPACE coordinates */
  onMeasurePointsChange?: (pointA: { x: number; y: number } | null, pointB: { x: number; y: number } | null) => void
  /** Generate highlight overlay data (runs in worker) */
  generateHighlightOverlay?: (
    targetR: number,
    targetG: number,
    targetB: number,
    tolerance: number,
    mode: 'solid' | 'heatmap'
  ) => Promise<Uint8ClampedArray | null>
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

export default function ImageCanvas(props: ImageCanvasProps) {
  const { onColorSample, image, onImageLoad, valueScaleSettings } = props
  const breakdownValue = useStore(state => state.breakdownValue)
  const valueModeEnabled = useStore(state => state.valueModeEnabled)
  const surfaceImage = useStore(state => state.surfaceImage)
  const gridOpacity = useStore(state => state.gridOpacity)
  const referenceOpacity = useStore(state => state.referenceOpacity)
  const referenceTransform = useStore(state => state.referenceTransform)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const valueMapCanvasRef = useRef<HTMLCanvasElement>(null)
  const breakdownCanvasRef = useRef<HTMLCanvasElement>(null)
  const sourceBufferRef = useRef<HTMLCanvasElement | null>(null)
  const desktopFileInputId = useId()
  const mobileFileInputId = useId()

  const debugModeEnabled = useStore(state => state.debugModeEnabled)
  const [metrics, setMetrics] = useState<{
    originalWidth: number;
    originalHeight: number;
    bufferWidth: number;
    bufferHeight: number;
    displayWidth: number;
    displayHeight: number;
    dpr: number;
  } | null>(null)

  const [minimapVisible, setMinimapVisible] = useState(false)
  const minimapTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const showMinimap = useCallback(() => {
    setMinimapVisible(true)
    if (minimapTimeoutRef.current) clearTimeout(minimapTimeoutRef.current)
    minimapTimeoutRef.current = setTimeout(() => {
      setMinimapVisible(false)
    }, 2000)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (minimapTimeoutRef.current) clearTimeout(minimapTimeoutRef.current)
    }
  }, [])

  const [surfaceImageElement, setSurfaceImageElement] = useState<HTMLImageElement | null>(null)

  // Load surface image into element
  useEffect(() => {
    if (!surfaceImage) {
      setSurfaceImageElement(null)
      return
    }
    const img = new Image()
    img.src = surfaceImage
    img.onload = () => setSurfaceImageElement(img)
  }, [surfaceImage])

  // Use the image analyzer hook for worker-based processing
  const {
    labBuffer,
    valueBuffer,
    sortedLuminances,
    valueScaleResult: analyzerValueScaleResult,
    histogramBins,
    isAnalyzing,
    breakdownBuffers,
    generateBreakdown,
    isGeneratingBreakdown,
  } = useImageAnalyzer(image, valueScaleSettings)

  // Use the hook's value scale result, but allow local override for settings changes
  const [localValueScaleResult] = useState<ValueScaleResult | null>(null)
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
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 })

  // View mode state
  const [isGrayscale, setIsGrayscale] = useState(false)
  const [splitMode, setSplitMode] = useState(false)
  const [showImageFullScreen, setShowImageFullScreen] = useState(false)

  // Mobile Stabilization: Create source buffer when image changes
  // Moved after canvasDimensions state to fix hoisting error
  useEffect(() => {
    // Immediate reset when image changes to prevent stale display
    sourceBufferRef.current = null
    setMetrics(null) // Clears debug overlay data

    if (!image) {
      return
    }

    const initSourceBuffer = async () => {
      try {
        const buffer = await createSourceBuffer(image)

        // Check if image is still the same (race condition safety)
        if (image.src !== buffer.getAttribute('data-origin-src')) {
          // In a real app we'd verify IDs, but here we just rely on the ref update
          // which is synchronous with the effect run
        }

        sourceBufferRef.current = buffer

        // Update metrics for debug overlay
        setMetrics({
          originalWidth: image.width,
          originalHeight: image.height,
          bufferWidth: buffer.width,
          bufferHeight: buffer.height,
          displayWidth: canvasDimensions.width,
          displayHeight: canvasDimensions.height,
          dpr: window.devicePixelRatio || 1
        })
      } catch (err) {
        console.error('[ImageCanvas] Source buffer creation failed:', err)
        // Fallback to original image if buffer creation fails
        sourceBufferRef.current = null
      }
    }

    initSourceBuffer()
  }, [image, canvasDimensions])

  // Value Mode overrides the canvas preview into grayscale
  useEffect(() => {
    setIsGrayscale(valueModeEnabled)
  }, [valueModeEnabled])

  const activeBreakdownStep = useMemo<BreakdownStep>(() => {
    if (breakdownValue <= 10) return 'Original'
    if (breakdownValue <= 35) return 'Imprimatura'
    if (breakdownValue <= 60) return 'Dead Color'
    if (breakdownValue <= 85) return 'Local Color'
    return 'Spectral Glaze'
  }, [breakdownValue])

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

  // Touch gesture state refs
  const touchStateRef = useRef({
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 },
    isPinching: false,
    touchStartTime: 0,
    lastTapTime: 0,
    touchStartPos: { x: 0, y: 0 },
  })

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

  // No longer needed, using shared calculateFit


  // Draw image on canvas with zoom and pan transforms
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const rectWidth = Math.floor(rect.width)
    const rectHeight = Math.floor(rect.height)
    if (
      rectWidth > 0 &&
      rectHeight > 0 &&
      (canvasDimensions.width !== rectWidth || canvasDimensions.height !== rectHeight)
    ) {
      setCanvasDimensions({ width: rectWidth, height: rectHeight })
    }

    // Set internal resolution (DPR aware)
    if (canvas.width !== rectWidth * dpr || canvas.height !== rectHeight * dpr) {
      canvas.width = rectWidth * dpr
      canvas.height = rectHeight * dpr
      canvas.style.width = `${rectWidth}px`
      canvas.style.height = `${rectHeight}px`
    }

    // Clear canvas
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, rectWidth, rectHeight)

    if ((!image && !surfaceImageElement) || !imageDrawInfo) {
    // Debug: log why canvas isn't drawing
    if (image && !imageDrawInfo) {
      const msg = `drawCanvas skipped: imageDrawInfo is null, dims=${canvasDimensions.width}x${canvasDimensions.height}`
      console.warn('[ImageCanvas]', msg)
    }
    return
  }
  
  // Debug: log when canvas IS drawing
  if (image && imageDrawInfo) {
    // console.log('[ImageCanvas] Drawing canvas');
  }

    // Save context state
    ctx.save()

    // Apply pan and zoom transforms
    ctx.translate(panOffset.x, panOffset.y)
    ctx.scale(zoomLevel, zoomLevel)

    // Draw image at the calculated fit position
    const { x, y, width, height } = imageDrawInfo

    // 1. Draw Surface Image (Background)
    if (surfaceImageElement) {
      ctx.save()
      ctx.drawImage(surfaceImageElement, x, y, width, height)
      ctx.restore()
    }

    // 2. Draw Reference Image (Foreground)
    if (image && imageDrawInfo) {
      ctx.save()

      // Apply reference opacity
      ctx.globalAlpha = referenceOpacity

      // Apply transformations centered on the image
      const centerX = x + width / 2
      const centerY = y + height / 2

      ctx.translate(centerX, centerY)
      ctx.rotate((referenceTransform.rotation * Math.PI) / 180)
      ctx.scale(referenceTransform.scale, referenceTransform.scale)
      ctx.translate(-centerX, -centerY)

      // Apply X/Y offsets from transform state
      ctx.translate(referenceTransform.x, referenceTransform.y)
    }

    if (splitMode && valueMapCanvasRef.current) {
      const splitX = width / 2

      // Left half: Original
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, splitX, height)
      ctx.clip()
      if (isGrayscale && image) ctx.filter = 'grayscale(100%)'
      if (image) ctx.drawImage(image, x, y, width, height)
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
      // Normal rendering or breakdown
      if (isGrayscale && activeBreakdownStep === 'Original') ctx.filter = 'grayscale(100%)'

      // Always draw the base image as a fallback if the breakdown is not ready
      // Or if the breakdown is the 'Spectral Glaze' (which is mostly transparent)
      const stepToBuffer: Record<string, keyof typeof breakdownBuffers> = {
        'Imprimatura': 'imprimatura',
        'Dead Color': 'deadColor',
        'Local Color': 'localColor',
        'Spectral Glaze': 'spectralGlaze'
      };

      const currentBuffer = activeBreakdownStep !== 'Original' ? breakdownBuffers[stepToBuffer[activeBreakdownStep]] : null;

      const showBaseUnderneath = activeBreakdownStep === 'Original' ||
        activeBreakdownStep === 'Spectral Glaze' ||
        !currentBuffer;

      if (showBaseUnderneath) {
        // Mobile Stabilization: Draw from source buffer if available, fallback to image
        const source = sourceBufferRef.current || image
        if (source) {
          ctx.drawImage(source as CanvasImageSource, x, y, width, height)
        }
      }

      if (isGrayscale && activeBreakdownStep === 'Original') ctx.filter = 'none'

      // Blend value map overlay if enabled and we are in original view
      if (activeBreakdownStep === 'Original' && valueScaleSettings?.enabled && valueMapCanvasRef.current) {
        const opacity = valueScaleSettings.opacity ?? 0.45
        ctx.globalAlpha = opacity
        ctx.drawImage(valueMapCanvasRef.current, x, y, width, height)
        ctx.globalAlpha = 1.0
      } else if (activeBreakdownStep !== 'Original' && breakdownCanvasRef.current) {
        // Draw Breakdown Layer on top
        // If it's Imprimatura, it already has some transparency from the worker
        ctx.drawImage(breakdownCanvasRef.current, x, y, width, height)
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

      ctx.strokeStyle = `rgba(255, 255, 255, ${gridOpacity})`
      ctx.lineWidth = 1 / zoomLevel
      ctx.setLineDash([5 / zoomLevel, 5 / zoomLevel])

      ctx.font = `${12 / zoomLevel}px monospace`
      ctx.fillStyle = `rgba(255, 255, 255, ${gridOpacity + 0.2})`
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

    // Restore global context state
    ctx.restore()
  }, [image, surfaceImageElement, imageDrawInfo, zoomLevel, panOffset, labBuffer, isGrayscale, gridEnabled, gridPhysicalWidth, gridPhysicalHeight, gridSquareSize, gridOpacity, referenceOpacity, referenceTransform, valueScaleSettings, analyzerValueScaleResult, splitMode, props.canvasSettings, activeBreakdownStep, breakdownBuffers, breakdownCanvasRef, overlayCanvasRef, sourceBufferRef, valueMapCanvasRef])

  // Resize observer to update canvas dimensions when container resizes
  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    if (!canvasContainer) return

    // Initialize dimensions immediately (critical for mobile)
    const updateDimensions = () => {
      const rect = canvasContainer.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setCanvasDimensions({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        })
        return true
      }
      return false
    }

    // Try immediate update
    if (!updateDimensions()) {
      // If dimensions are 0, wait for next frame (mobile layout might be delayed)
      requestAnimationFrame(() => {
        updateDimensions()
      })
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setCanvasDimensions({
            width: Math.floor(width),
            height: Math.floor(height),
          })
        }
      }
    })

    resizeObserver.observe(canvasContainer)
    return () => resizeObserver.disconnect()
  }, []) // Removed dependency on image to avoid observer churn

  // Update image draw info when image changes (reset zoom/pan)
  useEffect(() => {
    const mainImg = image || surfaceImageElement
    if (!mainImg) return
    
    // Wait for canvas dimensions to be set (critical for mobile)
    if (canvasDimensions.width === 0 || canvasDimensions.height === 0) {
      // Force a re-check by reading container dimensions directly
      const canvasContainer = canvasContainerRef.current
      if (canvasContainer) {
        const rect = canvasContainer.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          const newDims = {
            width: Math.floor(rect.width),
            height: Math.floor(rect.height),
          }
          setCanvasDimensions(newDims)
          // Calculate imageDrawInfo immediately with new dimensions
          const info = calculateFit(
            newDims,
            { width: mainImg.width, height: mainImg.height }
          )
          setImageDrawInfo(info)
          setZoomLevel(1)
          setPanOffset({ x: 0, y: 0 })
          return
        } else {
          // If still 0, wait one more frame for layout
          requestAnimationFrame(() => {
            const retryRect = canvasContainer.getBoundingClientRect()
            if (retryRect.width > 0 && retryRect.height > 0) {
              const newDims = {
                width: Math.floor(retryRect.width),
                height: Math.floor(retryRect.height),
              }
              setCanvasDimensions(newDims)
              const info = calculateFit(
                newDims,
                { width: mainImg.width, height: mainImg.height }
              )
              setImageDrawInfo(info)
              setZoomLevel(1)
              setPanOffset({ x: 0, y: 0 })
            }
          })
        }
      }
      return
    }

    const info = calculateFit(
      { width: canvasDimensions.width, height: canvasDimensions.height },
      { width: mainImg.width, height: mainImg.height }
    )
    setImageDrawInfo(info)
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }, [image, surfaceImageElement, canvasDimensions])

  // Update image draw info on resize without resetting zoom/pan
  useEffect(() => {
    const mainImg = image || surfaceImageElement
    if (!mainImg) return
    
    // Skip if dimensions are invalid
    if (canvasDimensions.width === 0 || canvasDimensions.height === 0) {
      return
    }

    const info = calculateFit(
      { width: canvasDimensions.width, height: canvasDimensions.height },
      { width: mainImg.width, height: mainImg.height }
    )
    setImageDrawInfo(info)
  }, [canvasDimensions, image, surfaceImageElement])

  // Redraw canvas when zoom, pan, or image changes
  useEffect(() => {
    drawCanvas()
  }, [drawCanvas, props.highlightMode, props.highlightColor, props.highlightTolerance])

  // Force dimension initialization when image is set (mobile fix)
  useEffect(() => {
    if (!image) return
    
    // If dimensions are 0 or imageDrawInfo is missing, force initialization
    if (canvasDimensions.width === 0 || canvasDimensions.height === 0 || !imageDrawInfo) {
      const canvasContainer = canvasContainerRef.current
      if (canvasContainer) {
        // Try multiple times with delays to catch layout
        const tryInit = (attempt = 0) => {
          const rect = canvasContainer.getBoundingClientRect()
          
          if (rect.width > 0 && rect.height > 0) {
            const newDims = {
              width: Math.floor(rect.width),
              height: Math.floor(rect.height),
            }
            setCanvasDimensions(newDims)
            const info = calculateFit(
              newDims,
              { width: image.width, height: image.height }
            )
            setImageDrawInfo(info)
            console.log('[ImageCanvas] Force-init success:', newDims)
          } else {
            // If height is still 0, try using parent's computed height
            const parent = canvasContainer.parentElement
            if (parent) {
              const parentRect = parent.getBoundingClientRect()
              const parentStyle = window.getComputedStyle(parent)
              
              // Try using parent height minus toolbar if available
              if (parentRect.height > 0 && rect.height === 0) {
                // Estimate: parent height minus toolbar (~60px)
                const estimatedHeight = Math.max(100, parentRect.height - 100)
                const newDims = {
                  width: Math.floor(rect.width || parentRect.width),
                  height: Math.floor(estimatedHeight),
                }
                setCanvasDimensions(newDims)
                const info = calculateFit(
                  newDims,
                  { width: image.width, height: image.height }
                )
                setImageDrawInfo(info)
                return
              }
            }
            
            if (attempt < 10) {
              // Retry up to 10 times with increasing delays
              setTimeout(() => tryInit(attempt + 1), 100 * (attempt + 1))
            }
          }
        }
        tryInit()
      }
    }
  }, [image, canvasDimensions.width, canvasDimensions.height, imageDrawInfo])

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
      showMinimap()
    },
    [image, zoomLevel, zoomAtPoint, showMinimap]
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

  // Mobile Stabilization: Bound the pan offset so the image doesn't disappear
  const getClampedPan = useCallback((x: number, y: number, zoom: number) => {
    if (!imageDrawInfo) return { x, y }

    const { x: imgX, y: imgY, width: imgW, height: imgH } = imageDrawInfo
    const viewportW = canvasDimensions.width
    const viewportH = canvasDimensions.height

    // Transformed image bounds in logical screen space
    const tw = imgW * zoom
    const th = imgH * zoom

    // Ensure at least 20% of the image remains visible
    const minVisible = 0.2

    // Logically: we want [imgX*zoom + panX, imgX*zoom + panX + tw] to overlap with [0, viewportW]
    // Simplified:
    const limitX = Math.max(viewportW, tw) * 0.8
    const limitY = Math.max(viewportH, th) * 0.8

    return {
      x: Math.max(-limitX - imgX * zoom, Math.min(viewportW + limitX - (imgX * zoom + tw), x)),
      y: Math.max(-limitY - imgY * zoom, Math.min(viewportH + limitY - (imgY * zoom + th), y))
    }
  }, [imageDrawInfo, canvasDimensions])

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

    // Mobile Stabilization: Sample from source buffer for 1:1 pixel accuracy
    const source = sourceBufferRef.current
    let r, g, b, a;

    if (source) {
      // Calculate coordinates in source buffer space
      const { x, y, width, height } = imageDrawInfo!

      // 1. Transform back to unpanned, unzoomed image-draw-info space
      const screenRelX = (canvasX - panOffset.x) / zoomLevel
      const screenRelY = (canvasY - panOffset.y) / zoomLevel

      // 2. Transform to normalized 0-1 image coordinates
      const normX = (screenRelX - x) / width
      const normY = (screenRelY - y) / height

      if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return

      // 3. Map to source buffer pixels
      const sampleX = Math.floor(normX * source.width)
      const sampleY = Math.floor(normY * source.height)

      const sourceCtx = source.getContext('2d')
      if (!sourceCtx) return
      const pixel = sourceCtx.getImageData(sampleX, sampleY, 1, 1).data
      r = pixel[0]
      g = pixel[1]
      b = pixel[2]
      a = pixel[3]
    } else {
      // Fallback to display canvas (less accurate if filtered/scaled)
      const pixelData = ctx.getImageData(Math.floor(canvasX), Math.floor(canvasY), 1, 1).data
      r = pixelData[0]
      g = pixelData[1]
      b = pixelData[2]
      a = pixelData[3]
    }

    if (a === 0) return

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

      const deltaX = e.clientX - lastPanPoint.current.x
      const deltaY = e.clientY - lastPanPoint.current.y

      setPanOffset((prev) => getClampedPan(prev.x + deltaX, prev.y + deltaY, zoomLevel))

      lastPanPoint.current = { x: e.clientX, y: e.clientY }
      showMinimap()
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

  // ============================================
  // TOUCH EVENT HANDLERS (Mobile Support)
  // ============================================

  // Helper: Get distance between two touch points
  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
  }

  // Helper: Get center point between two touches (logical pixels)
  const getTouchCenter = (t1: React.Touch, t2: React.Touch, rect: DOMRect) => {
    return {
      x: (t1.clientX + t2.clientX) / 2 - rect.left,
      y: (t1.clientY + t2.clientY) / 2 - rect.top,
    }
  }

  // Sample color from touch position (similar to sampleColor but for touch events)
  const sampleColorFromTouch = useCallback((touch: React.Touch) => {
    if (!canvasRef.current || !image) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const canvasX = (touch.clientX - rect.left) * scaleX
    const canvasY = (touch.clientY - rect.top) * scaleY

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

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!image) return

    const canvas = canvasRef.current
    if (!canvas) return

    const now = Date.now()
    const touch = e.touches[0]

    // Store touch start info
    touchStateRef.current.touchStartTime = now
    touchStateRef.current.touchStartPos = { x: touch.clientX, y: touch.clientY }

    const rect = canvas.getBoundingClientRect()

    if (e.touches.length === 2) {
      // Two fingers: init pinch/pan
      e.preventDefault()

      touchStateRef.current.isPinching = true
      touchStateRef.current.lastDistance = getTouchDistance(e.touches[0], e.touches[1])
      touchStateRef.current.lastCenter = getTouchCenter(e.touches[0], e.touches[1], rect)
    } else if (e.touches.length === 1) {
      // Single finger: potential tap or pan
      touchStateRef.current.isPinching = false
      hasDraggedRef.current = false
      dragStartRef.current = { x: touch.clientX, y: touch.clientY }
    }
  }, [image])

  // Handle touch move  
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!image) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    if (e.touches.length === 2) {
      // Two-finger gesture: pinch-to-zoom and pan
      e.preventDefault()

      const newDistance = getTouchDistance(e.touches[0], e.touches[1])
      const newCenter = getTouchCenter(e.touches[0], e.touches[1], rect)

      if (touchStateRef.current.isPinching && touchStateRef.current.lastDistance > 0) {
        // Calculate zoom
        const zoomDelta = newDistance / touchStateRef.current.lastDistance
        const targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomLevel * zoomDelta))

        // Apply zoom centered on pinch point (logical coordinates)
        const zoomRatio = targetZoom / zoomLevel
        const newPanX = newCenter.x - (newCenter.x - panOffset.x) * zoomRatio
        const newPanY = newCenter.y - (newCenter.y - panOffset.y) * zoomRatio

        // Apply pan delta (logical coordinates)
        const panDeltaX = newCenter.x - touchStateRef.current.lastCenter.x
        const panDeltaY = newCenter.y - touchStateRef.current.lastCenter.y

        setZoomLevel(targetZoom)
        const clampedPan = getClampedPan(newPanX + panDeltaX, newPanY + panDeltaY, targetZoom)
        setPanOffset(clampedPan)
      }

      touchStateRef.current.lastDistance = newDistance
      touchStateRef.current.lastCenter = newCenter
    } else if (e.touches.length === 1 && !touchStateRef.current.isPinching) {
      // Single finger drag: check if we've moved enough to consider it a pan
      const touch = e.touches[0]
      const dist = Math.hypot(
        touch.clientX - dragStartRef.current.x,
        touch.clientY - dragStartRef.current.y
      )

      if (dist > DRAG_THRESHOLD) {
        hasDraggedRef.current = true
        // Pan the canvas - removing scaleX/Y for 1:1 logical pixel panning
        const deltaX = touch.clientX - (lastPanPoint.current.x || touch.clientX)
        const deltaY = touch.clientY - (lastPanPoint.current.y || touch.clientY)
        setPanOffset(prev => getClampedPan(prev.x + deltaX, prev.y + deltaY, zoomLevel))
        showMinimap()
      }
      lastPanPoint.current = { x: touch.clientX, y: touch.clientY }
    }
  }, [image, zoomLevel, panOffset, showMinimap, getClampedPan])

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!image) return

    const now = Date.now()
    const touchDuration = now - touchStateRef.current.touchStartTime

    // Reset pinching state if all fingers lifted
    if (e.touches.length === 0) {
      touchStateRef.current.isPinching = false

      // Check for taps (short duration, no significant drag)
      if (touchDuration < 300 && !hasDraggedRef.current) {
        const timeSinceLastTap = now - touchStateRef.current.lastTapTime

        if (timeSinceLastTap < 300) {
          // Double-tap: reset view
          resetView()
          touchStateRef.current.lastTapTime = 0
        } else {
          // Single tap: sample color (if not in measure mode)
          if (!props.measureMode && e.changedTouches.length > 0) {
            sampleColorFromTouch(e.changedTouches[0])
          }
          touchStateRef.current.lastTapTime = now
        }
      }
    }

    // Reset drag state
    hasDraggedRef.current = false
    lastPanPoint.current = { x: 0, y: 0 }
  }, [getClampedPan, imageDrawInfo, canvasDimensions, image, zoomLevel, props.measureMode, sampleColorFromTouch, resetView])

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

  // Update highlight overlay using worker
  useEffect(() => {
    const { highlightColor, highlightTolerance = 20, highlightMode = 'solid' } = props
    if (!labBuffer || !highlightColor) {
      const canvas = overlayCanvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    let isSubscribed = true

    const updateHighlight = async () => {
      const overlayData = await props.generateHighlightOverlay?.(
        highlightColor.r,
        highlightColor.g,
        highlightColor.b,
        highlightTolerance,
        highlightMode
      )

      if (!isSubscribed || !overlayData) return

      const canvas = overlayCanvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (canvas.width !== labBuffer.width || canvas.height !== labBuffer.height) {
        canvas.width = labBuffer.width
        canvas.height = labBuffer.height
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const imageData = new ImageData(new Uint8ClampedArray(overlayData), labBuffer.width, labBuffer.height)
      ctx.putImageData(imageData, 0, 0)
      drawCanvas()
    }

    updateHighlight()

    return () => {
      isSubscribed = false
    }
  }, [labBuffer, props.highlightColor, props.highlightTolerance, props.highlightMode, props.generateHighlightOverlay, drawCanvas])

  // Draw breakdown layers to offscreen canvas
  useEffect(() => {
    const canvas = breakdownCanvasRef.current
    if (!canvas || !breakdownBuffers || !labBuffer) return

    const stepToBuffer: Record<string, keyof typeof breakdownBuffers> = {
      'Imprimatura': 'imprimatura',
      'Dead Color': 'deadColor',
      'Local Color': 'localColor',
      'Spectral Glaze': 'spectralGlaze'
    };

    const buffer = activeBreakdownStep !== 'Original' ? breakdownBuffers[stepToBuffer[activeBreakdownStep]] : null;

    if (!buffer) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      drawCanvas()
      return
    }

    const { width, height } = labBuffer

    // Ensure canvas is large enough
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height)
    ctx.putImageData(imageData, 0, 0)
    drawCanvas()
  }, [breakdownBuffers, activeBreakdownStep, drawCanvas, labBuffer])

  // Trigger breakdown generation when image is loaded
  useEffect(() => {
    if (image && !isGeneratingBreakdown && !breakdownBuffers.imprimatura) {
      generateBreakdown()
    }
  }, [image, breakdownBuffers.imprimatura, isGeneratingBreakdown, generateBreakdown])

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

  const handleActualSize = useCallback(() => {
    if (!props.calibration || !props.canvasSettings?.enabled || !image || !imageDrawInfo) return

    const { pxPerInch } = props.calibration
    const { width: physicalWidth, unit } = props.canvasSettings

    // Convert physical width to inches if it's in cm
    const widthInInches = unit === 'cm' ? physicalWidth / 2.54 : physicalWidth

    // To get actual size: targetScale * baseImageWidth (px) = physicalWidth (inches) * pxPerInch
    // targetScale = (physicalWidth (inches) * pxPerInch) / baseImageWidth
    // Note: imageDrawInfo.width is the "fit-to-canvas" width (base width before zoom)

    const targetZoom = (widthInInches * pxPerInch) / imageDrawInfo.width

    const canvas = canvasRef.current
    if (canvas) {
      // Zoom centered on the middle of the canvas
      zoomAtPoint(targetZoom, canvas.width / 2, canvas.height / 2)
    }
  }, [props.calibration, props.canvasSettings, image, imageDrawInfo, zoomAtPoint])

  const isActualSizeEnabled = !!(props.calibration?.pxPerInch && props.canvasSettings?.enabled && imageDrawInfo)

  // Check if file is an image by extension or MIME type
  const isImageFile = useCallback((file: File): boolean => {
    // Check MIME type first
    if (file.type && file.type.startsWith('image/')) {
      return true
    }
    
    // Check by file extension (handles HEIC, WebP, etc. that might have wrong MIME type)
    const extension = file.name.toLowerCase().split('.').pop()
    const imageExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
      'heic', 'heif', 'avif', 'tiff', 'tif', 'raw', 'cr2', 'nef', 'orf', 'sr2'
    ]
    
    return imageExtensions.includes(extension || '')
  }, [])

  // Handle direct file input for mobile/desktop "New Image" action
  const handleDirectFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file) {
      return
    }

    // Validate file type (by extension or MIME type)
    if (!isImageFile(file)) {
      console.error('[ImageCanvas] Invalid file type:', file.type, 'File:', file.name)
      alert(`"${file.name}" is not a supported image format. Please use JPEG, PNG, WebP, HEIC, or other common image formats.`)
      input.value = ''
      return
    }

    let processedFile = file
    
    // Handle HEIC/HEIF conversion
    const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                  file.name.toLowerCase().endsWith('.heif') ||
                  file.type === 'image/heic' || 
                  file.type === 'image/heif'
    
    if (isHeic) {
      // Ensure we're in browser environment
      if (typeof window === 'undefined' || typeof Blob === 'undefined') {
        console.error('[ImageCanvas] HEIC conversion requires browser environment')
        alert('HEIC conversion is not available in this environment. Please convert your image to JPEG first.')
        input.value = ''
        return
      }

      // Validate file size (heic2any may struggle with very large files)
      const maxHeicSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxHeicSize) {
        alert(`HEIC file is too large (${Math.round(file.size / 1024 / 1024)}MB). Please convert to JPEG first or use a smaller file.`)
        input.value = ''
        return
      }

      try {
        console.log('[ImageCanvas] Converting HEIC file...', file.name, file.size, 'bytes')
        
        // Dynamic import with error handling
        let heic2any
        try {
          const heic2anyModule = await import('heic2any')
          heic2any = heic2anyModule.default || heic2anyModule
          
          if (typeof heic2any !== 'function') {
            throw new Error(`heic2any is not a function: ${typeof heic2any}`)
          }
        } catch (importErr) {
          console.error('[ImageCanvas] Failed to import heic2any:', importErr)
          const importErrorMsg = importErr instanceof Error 
            ? importErr.message 
            : String(importErr)
          throw new Error(`Failed to load HEIC converter: ${importErrorMsg}`)
        }

        // Check WebAssembly support (heic2any requires it)
        if (typeof WebAssembly === 'undefined') {
          throw new Error('WebAssembly is not supported in this browser. HEIC conversion requires WebAssembly support.')
        }

        // Convert HEIC to JPEG with timeout
        // Wrap in try-catch to catch any synchronous errors
        let conversionPromise: Promise<Blob | Blob[]>
        try {
          console.log('[ImageCanvas] Calling heic2any with file:', {
            name: file.name,
            size: file.size,
            type: file.type
          })
          
          conversionPromise = heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.95
          })
          
          if (!(conversionPromise instanceof Promise)) {
            throw new Error(`heic2any did not return a Promise, got: ${typeof conversionPromise}`)
          }
          
          console.log('[ImageCanvas] heic2any promise created successfully')
        } catch (syncErr) {
          console.error('[ImageCanvas] Synchronous error during heic2any call:', syncErr)
          throw new Error(`Failed to start HEIC conversion: ${syncErr instanceof Error ? syncErr.message : String(syncErr)}`)
        }

        // Add timeout (30 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('HEIC conversion timed out after 30 seconds')), 30000)
        )

        // Wrap conversion promise to capture any errors
        const wrappedConversionPromise = conversionPromise.catch((conversionErr) => {
          console.error('[ImageCanvas] Conversion promise rejected:', conversionErr)
          console.error('[ImageCanvas] Conversion error type:', typeof conversionErr)
          console.error('[ImageCanvas] Conversion error constructor:', conversionErr?.constructor?.name)
          
          // Deep inspection of the "empty" object
          const allProps = conversionErr ? Object.getOwnPropertyNames(conversionErr) : [];
          console.error('[ImageCanvas] Conversion error all properties:', allProps);
          
          // Try to extract error message
          let errorMsg = 'HEIC conversion failed'
          if (conversionErr instanceof Error) {
            errorMsg = conversionErr.message || 'Unknown conversion error'
          } else if (typeof conversionErr === 'string') {
            errorMsg = conversionErr
          } else if (conversionErr && typeof conversionErr === 'object') {
            // Try to get message property or any descriptive property
            const errObj = conversionErr as any
            errorMsg = errObj.message || errObj.error || errObj.code || errObj.toString?.() || 'Conversion error (details unavailable)'
          }
          
          throw new Error(`HEIC conversion failed: ${errorMsg}`)
        })

        let convertedBlob: Blob | Blob[]
        try {
          convertedBlob = await Promise.race([wrappedConversionPromise, timeoutPromise])
          console.log('[ImageCanvas] Conversion completed successfully')
        } catch (raceErr) {
          // Check if it's the timeout or the actual conversion error
          if (raceErr instanceof Error && raceErr.message.includes('timed out')) {
            throw raceErr
          }
          // The error should already be wrapped with context from wrappedConversionPromise
          console.error('[ImageCanvas] Error during Promise.race:', raceErr)
          console.error('[ImageCanvas] Race error type:', typeof raceErr)
          console.error('[ImageCanvas] Race error constructor:', raceErr?.constructor?.name)
          
          // Re-throw with more context if not already wrapped
          if (raceErr instanceof Error) {
            throw raceErr
          } else {
            throw new Error(`HEIC conversion failed: ${String(raceErr) || 'Unknown error during conversion'}`)
          }
        }

        if (!convertedBlob) {
          throw new Error('HEIC conversion returned no result')
        }

        // heic2any can return an array if multiple images are in the HEIC
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob

        if (!blob) {
          throw new Error('HEIC conversion returned null or undefined')
        }

        if (!(blob instanceof Blob)) {
          throw new Error(`Invalid conversion result: expected Blob, got ${typeof blob} (${Object.prototype.toString.call(blob)})`)
        }

        if (blob.size === 0) {
          throw new Error('HEIC conversion returned empty blob')
        }

        processedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
          type: 'image/jpeg',
        })
        console.log('[ImageCanvas] HEIC converted to JPEG:', processedFile.size, 'bytes')
      } catch (err) {
        // Extract error information with more aggressive error extraction
        let errorMessage = 'Unknown error'
        let errorDetails: any = {}
        
        // Log the raw error first
        console.error('[ImageCanvas] Raw error caught:', err)
        console.error('[ImageCanvas] Error type:', typeof err)
        console.error('[ImageCanvas] Error constructor:', err?.constructor?.name)
        console.error('[ImageCanvas] Error keys:', err ? Object.keys(err) : 'no keys')
        
        if (err instanceof Error) {
          errorMessage = err.message || 'Error without message'
          errorDetails = {
            message: err.message,
            name: err.name,
            stack: err.stack?.split('\n').slice(0, 10).join('\n') // More stack lines
          }
        } else if (typeof err === 'string') {
          errorMessage = err
          errorDetails = { error: err }
        } else if (err && typeof err === 'object') {
          // Try to extract properties from the error object
          try {
            const errObj = err as Record<string, any>
            errorMessage = errObj.message || errObj.error || errObj.toString?.() || 'Object error'
            errorDetails = {
              ...errObj,
              type: typeof err,
              constructor: err.constructor?.name,
              stringified: JSON.stringify(err, Object.getOwnPropertyNames(err))
            }
          } catch (extractErr) {
            // If we can't extract, try to stringify with replacer
            try {
              errorMessage = JSON.stringify(err, (key, value) => {
                if (value instanceof Error) {
                  return { message: value.message, name: value.name, stack: value.stack }
                }
                return value
              })
            } catch {
              errorMessage = `Conversion failed - error type: ${typeof err}, constructor: ${err?.constructor?.name || 'unknown'}`
            }
            errorDetails = { 
              error: 'Non-serializable error object',
              type: typeof err,
              constructor: err?.constructor?.name
            }
          }
        } else {
          errorMessage = String(err) || 'Unknown error type'
          errorDetails = { 
            error: String(err),
            type: typeof err
          }
        }
        
        console.error('[ImageCanvas] HEIC conversion failed - errorDetails:', errorDetails)
        console.error('[ImageCanvas] HEIC conversion failed - errorMessage:', errorMessage)
        console.error('[ImageCanvas] Full error object (direct):', err)
        console.error('[ImageCanvas] Full error object (JSON):', JSON.stringify(err, null, 2))
        
        alert(`Failed to convert HEIC image.\n\nError: ${errorMessage}\n\nPlease try:\n1. Converting the image to JPEG using your device's Photos app\n2. Using a different image format\n3. Trying a smaller HEIC file (under 50MB)`)
        input.value = ''
        return
      }
    }

    console.log('[ImageCanvas] Direct file input selected:', processedFile.name, processedFile.type, processedFile.size)
    const objectUrl = URL.createObjectURL(processedFile)
    const img = new Image()
    
    // Cleanup function to revoke object URL
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
    }

    img.onload = () => {
      const logMsg1 = `✅ Image loaded: ${img.width}x${img.height}, src: ${img.src.substring(0, 30)}`
      console.log('[ImageCanvas]', logMsg1)
      
      // Convert to data URL to preserve image source (blob URLs get revoked)
      // This ensures the fallback image can display even if canvas isn't ready
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        try {
          const dataUrl = canvas.toDataURL('image/png')
          img.src = dataUrl
          const logMsg2 = `✅ Converted to data URL (${dataUrl.length} chars)`
          console.log('[ImageCanvas]', logMsg2)
        } catch (e) {
          const logMsg3 = `❌ Data URL conversion failed: ${e}`
          console.error('[ImageCanvas]', logMsg3)
          // Keep blob URL alive - don't revoke yet
        }
      } else {
        const logMsg4 = '❌ Failed to get canvas context'
        console.error('[ImageCanvas]', logMsg4)
      }
      
      props.onImageLoad(img)
      // Don't revoke blob URL immediately - let it stay alive
      // cleanup() will be called when component unmounts or new image loads
      
      // Force dimension initialization after image loads (mobile fix)
      requestAnimationFrame(() => {
        const canvasContainer = canvasContainerRef.current
        if (canvasContainer) {
          const rect = canvasContainer.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            const newDims = {
              width: Math.floor(rect.width),
              height: Math.floor(rect.height),
            }
            setCanvasDimensions(newDims)
            const info = calculateFit(
              newDims,
              { width: img.width, height: img.height }
            )
            setImageDrawInfo(info)
            console.log('[ImageCanvas] Dimensions initialized:', newDims, 'imageDrawInfo:', info)
            // Now safe to revoke blob URL since we have data URL
            cleanup()
          } else {
            // Retry if dimensions aren't ready
            setTimeout(() => {
              const retryRect = canvasContainer.getBoundingClientRect()
              if (retryRect.width > 0 && retryRect.height > 0) {
                const newDims = {
                  width: Math.floor(retryRect.width),
                  height: Math.floor(retryRect.height),
                }
                setCanvasDimensions(newDims)
                const info = calculateFit(
                  newDims,
                  { width: img.width, height: img.height }
                )
                setImageDrawInfo(info)
                cleanup()
              }
            }, 100)
          }
        }
      })
    }
    
    img.onerror = (error) => {
      console.error('[ImageCanvas] Direct image load error:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        error: error
      })
      cleanup()
    }
    
    img.src = objectUrl
    input.value = ''
  }, [props.onImageLoad])

  // Get cursor style based on current mode
  const getCursorStyle = () => {
    if (isPanning) return 'grabbing'
    if (isSpaceDown) return 'grab'
    return 'crosshair'
  }

  // Debug logging for mobile issue
  useEffect(() => {
    if (image) {
      const shouldShowFallback = !imageDrawInfo || canvasDimensions.width === 0 || canvasDimensions.height === 0
      const renderState = {
        hasImage: !!image,
        imageSize: image ? `${image.width}x${image.height}` : 'null',
        imageSrc: image.src?.substring(0, 50),
        imageSrcType: image.src?.startsWith('data:') ? 'data URL' : image.src?.startsWith('blob:') ? 'blob URL' : 'other',
        imageComplete: image.complete,
        imageNaturalSize: `${image.naturalWidth}x${image.naturalHeight}`,
        hasSurfaceImage: !!surfaceImage,
        canvasDimensions,
        imageDrawInfoValue: imageDrawInfo,
        hasImageDrawInfo: !!imageDrawInfo,
        containerRefExists: !!containerRef.current,
        canvasContainerRefExists: !!canvasContainerRef.current,
        shouldShowFallback,
        conditionBreakdown: {
          '!imageDrawInfo': !imageDrawInfo,
          'width === 0': canvasDimensions.width === 0,
          'height === 0': canvasDimensions.height === 0
        }
      }
      const logMsg = `🔍 Render: ${image.width}x${image.height}, fallback=${shouldShowFallback}`
      console.log('[ImageCanvas]', logMsg, renderState)
      
      // Log fallback condition details
      if (shouldShowFallback) {
        // console.log('[ImageCanvas] FALLBACK triggered');
      } else {
        // console.log('[ImageCanvas] Canvas ready');
      }
    }
  }, [image, surfaceImage, canvasDimensions, imageDrawInfo])

  return (
    <div className="h-full flex flex-col" ref={containerRef}>
      <DebugOverlay isVisible={debugModeEnabled} metrics={metrics} />
      {!image && !surfaceImage ? (
        <ImageDropzone onImageLoad={onImageLoad} />
      ) : (
        <div className="flex-1 flex flex-col" style={{ height: '100%', minHeight: '100%' }}>
          {/* Zoom Controls Bar */}
          <ZoomControlsBar
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFit={resetView}
            onActualSize={handleActualSize}
            isActualSizeEnabled={isActualSizeEnabled}
            isGrayscale={isGrayscale}
            onToggleGrayscale={() => setIsGrayscale(!isGrayscale)}
            valueOverlayEnabled={valueScaleSettings?.enabled || false}
            onToggleValueOverlay={() => {
              if (props.onValueScaleChange && props.valueScaleSettings) {
                props.onValueScaleChange({
                  ...props.valueScaleSettings,
                  enabled: !props.valueScaleSettings.enabled
                })
              }
            }}
            splitViewEnabled={splitMode}
            onToggleSplitView={() => setSplitMode(!splitMode)}
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
            className="canvas-viewport flex-1 relative overflow-hidden md:rounded-lg md:border border-gray-700 bg-white md:bg-gray-900"
            style={{
              height: '100%',
              minHeight: '100%',
              width: '100%'
            }}
          >
            {/* Loading indicator */}
            {isAnalyzing && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2 text-xs text-white/70 bg-gray-900/80 px-2 py-1 rounded">
                <div className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            )}

            {/* Full-screen expand button */}
            <button
              onClick={() => setShowImageFullScreen(true)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white/70 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm"
              style={{ right: isAnalyzing ? '90px' : '16px' }}
              title="View full screen (click or ESC to close)"
            >
              <span className="text-lg">⛶</span>
            </button>

            <canvas
              ref={canvasRef}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute top-0 left-0 w-full h-full touch-none"
              style={{ 
                cursor: getCursorStyle(),
                zIndex: imageDrawInfo ? 20 : 5,
                backgroundColor: imageDrawInfo ? 'transparent' : 'transparent',
                pointerEvents: imageDrawInfo ? 'auto' : 'none'
              }}
            />

            {/* Highlight Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ display: 'none' }}
            />
            <canvas ref={valueMapCanvasRef} id="value-map-canvas" style={{ display: 'none' }} />
            <canvas ref={breakdownCanvasRef} id="breakdown-canvas" style={{ display: 'none' }} />

            {/* Ruler Grid & Measurement Overlay */}
            <RulerOverlay
              gridEnabled={props.gridEnabled || false}
              gridSpacing={props.gridSpacing || 1}
              gridOpacity={gridOpacity}
              calibration={props.calibration || null}
              measureEnabled={props.measureMode || false}
              measurePointA={props.measurePointA}
              measurePointB={props.measurePointB}
              containerRef={canvasContainerRef}
              onMeasurePointsChange={props.onMeasurePointsChange}
              transformState={{ zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined }}
              measurementLayer={props.measurementLayer}
              image={image || surfaceImageElement}
              canvasSettings={props.canvasSettings}
            />

            {/* Navigator Minimap */}
            <NavigatorMinimap
              image={image}
              transform={{ zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined }}
              canvasDimensions={canvasDimensions}
              isVisible={minimapVisible}
            />
          </div>

          {/* Keyboard hints - hidden on mobile */}
          <div className="hidden md:block mt-2 text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            Scroll/± to Zoom • Space+Drag to Pan • 0 to Fit • V: Value • S: Split • G: Grid
          </div>

          {/* Bottom Controls - visible on desktop, mobile uses header */}
          <div className="hidden md:flex items-center justify-between mt-4">
            <label
              htmlFor={desktopFileInputId}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors cursor-pointer"
            >
              <span>Load New Image</span>
            </label>
            <input
              id={desktopFileInputId}
              type="file"
              accept="image/*,.heic,.heif,.webp,.avif,.tiff,.tif,.bmp,.raw,.cr2,.nef,.orf,.sr2"
              onChange={handleDirectFileInput}
              className="sr-only"
            />
            <div className="text-gray-500 text-sm">
              Zoom: {Math.round(zoomLevel * 100)}% | Pan: ({Math.round(panOffset.x)}, {Math.round(panOffset.y)})
            </div>
          </div>

          {/* Mobile: New Image button */}
          <div className="flex md:hidden items-center justify-center mt-2 pb-2">
            <label
              htmlFor={mobileFileInputId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <span>New Image</span>
            </label>
            <input
              id={mobileFileInputId}
              type="file"
              accept="image/*,.heic,.heif,.webp,.avif,.tiff,.tif,.bmp,.raw,.cr2,.nef,.orf,.sr2"
              onChange={handleDirectFileInput}
              className="sr-only"
            />
          </div>
        </div>
      )}

      {/* Full Screen Image Overlay */}
      <FullScreenOverlay
        isOpen={showImageFullScreen}
        onClose={() => setShowImageFullScreen(false)}
      >
        {image && (
          <img
            src={image.src}
            alt="Full screen reference"
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        )}
      </FullScreenOverlay>
    </div>
  )
}
