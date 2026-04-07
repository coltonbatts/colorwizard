'use client'

/**
 * ImageCanvas - Main canvas component for image display and color sampling.
 * Refactored to compose focused submodules for rendering, interaction, and overlays.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import RulerOverlay from '@/components/RulerOverlay'
import { ZoomControlsBar, ImageDropzone, NavigatorMinimap } from '@/components/canvas'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { CalibrationData, type TransformState, screenToImage } from '@/lib/calibration'
import { MeasurementLayer } from '@/lib/types/measurement'
import { useImageAnalyzer } from '@/hooks/useImageAnalyzer'
import type { BreakdownStep } from '@/components/ProcessSlider'
import FullScreenOverlay from '@/components/FullScreenOverlay'
import CanvasHUD from '@/components/CanvasHUD'
import { createSourceBuffer } from '@/lib/imagePipeline'
import { DebugOverlay } from '@/components/DebugOverlay'
import { calculateFit } from '@/lib/canvasRendering'
import { CanvasSettings as AppCanvasSettings } from '@/lib/types/canvas'
import { ValueScaleSettings } from '@/lib/types/valueScale'
import { useCanvasStore } from '@/lib/store/useCanvasStore'
import { useCalibrationStore } from '@/lib/store/useCalibrationStore'
import { useDebugStore } from '@/lib/store/useDebugStore'
import { useSessionStore } from '@/lib/store/useSessionStore'
import { resolveTauriImageSrc } from '@/lib/tauri'
import {
  MAX_ZOOM,
  MIN_ZOOM,
  drawMainCanvas,
  getClampedPan,
  clientToCanvas,
} from '@/components/ImageCanvas/CanvasRenderer'
import { useZoomController } from '@/components/ImageCanvas/ZoomController'
import { usePanHandler } from '@/components/ImageCanvas/PanHandler'
import { sampleColor } from '@/components/ImageCanvas/ColorSampler'
import { HighlightOverlay } from '@/components/ImageCanvas/HighlightOverlay'
import { ValueOverlay } from '@/components/ImageCanvas/ValueOverlay'
import type { ColorData, RGB, ImageDrawInfo, PointerCoord } from '@/components/ImageCanvas/types'

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
  onValueScaleResult?: (result: import('@/lib/valueScale').ValueScaleResult) => void
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
  sampledColorHex?: string | null
  workspaceModeLabel?: string
  showHud?: boolean
  mobileLayout?: 'default' | 'sample'
  dismissPreviewSignal?: number
  suppressPreviewOverlay?: boolean
}

export interface ImageCanvasHandle {
  resetView: () => void
}

const ImageCanvas = forwardRef<ImageCanvasHandle, ImageCanvasProps>((props, ref) => {
  const {
    image,
    onImageLoad,
    onColorSample,
    valueScaleSettings,
    onValueScaleChange,
    onHistogramComputed,
    onValueScaleResult,
    onTransformChange,
    onMeasureClick,
    onMeasurePointsChange,
    generateHighlightOverlay,
    highlightColor,
    highlightTolerance,
    highlightMode,
    measureMode,
    calibration,
    gridEnabled: gridEnabledProp,
    gridSpacing,
    measurePointA,
    measurePointB,
    measurementLayer,
    canvasSettings,
    sampledColorHex,
    workspaceModeLabel,
    showHud = true,
    mobileLayout = 'default',
    dismissPreviewSignal,
    suppressPreviewOverlay = false,
  } = props

  const isMobile = useIsMobile()
  const breakdownValue = useCanvasStore(state => state.breakdownValue)
  const surfaceImage = useCanvasStore(state => state.surfaceImage)
  const referenceOpacity = useCanvasStore(state => state.referenceOpacity)
  const referenceTransform = useCanvasStore(state => state.referenceTransform)
  const valueModeEnabled = useSessionStore(state => state.valueModeEnabled)
  const gridOpacity = useCalibrationStore(state => state.gridOpacity)
  const debugModeEnabled = useDebugStore(state => state.debugModeEnabled)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const valueMapCanvasRef = useRef<HTMLCanvasElement>(null)
  const breakdownCanvasRef = useRef<HTMLCanvasElement>(null)
  const sourceBufferRef = useRef<HTMLCanvasElement | null>(null)
  const desktopFileInputId = useId()
  const mobileFileInputId = useId()

  const [metrics, setMetrics] = useState<{
    originalWidth: number
    originalHeight: number
    bufferWidth: number
    bufferHeight: number
    displayWidth: number
    displayHeight: number
    dpr: number
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

  useEffect(() => {
    return () => {
      if (minimapTimeoutRef.current) clearTimeout(minimapTimeoutRef.current)
    }
  }, [])

  const [surfaceImageElement, setSurfaceImageElement] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!surfaceImage) {
      setSurfaceImageElement(null)
      return
    }

    const img = new Image()
    img.src = resolveTauriImageSrc(surfaceImage) ?? surfaceImage
    img.onload = () => setSurfaceImageElement(img)
  }, [surfaceImage])

  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 })
  const [analysisSource, setAnalysisSource] = useState<CanvasImageSource | null>(image)
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
  } = useImageAnalyzer(analysisSource, valueScaleSettings)
  const valueScaleResult = analyzerValueScaleResult

  useEffect(() => {
    if (histogramBins.length > 0 && onHistogramComputed) {
      onHistogramComputed(histogramBins)
    }
  }, [histogramBins, onHistogramComputed])

  useEffect(() => {
    if (valueScaleResult && onValueScaleResult) {
      onValueScaleResult(valueScaleResult)
    }
  }, [valueScaleResult, onValueScaleResult])

  const [isGrayscale, setIsGrayscale] = useState(false)
  const [splitMode, setSplitMode] = useState(false)
  const [showImageFullScreen, setShowImageFullScreen] = useState(false)
  const [internalGridEnabled, setInternalGridEnabled] = useState(false)
  const [gridPhysicalWidth, setGridPhysicalWidth] = useState(20)
  const [gridPhysicalHeight, setGridPhysicalHeight] = useState(16)
  const [gridSquareSize, setGridSquareSize] = useState(1)
  const gridEnabled = gridEnabledProp ?? internalGridEnabled
  const hasRenderableImage = Boolean(image || surfaceImageElement)
  const mobileSampleLayout = isMobile && mobileLayout === 'sample'

  useEffect(() => {
    if (dismissPreviewSignal === undefined) return
    setShowImageFullScreen(false)
  }, [dismissPreviewSignal])

  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [imageDrawInfo, setImageDrawInfo] = useState<ImageDrawInfo | null>(null)
  const [highlightOverlay, setHighlightOverlay] = useState<{
    imageData: Uint8ClampedArray | null
    width: number
    height: number
  }>({ imageData: null, width: 0, height: 0 })

  const resetPan = useCallback(() => {
    setPanOffset({ x: 0, y: 0 })
  }, [])

  const zoom = useZoomController({
    canvasRef,
    image,
    zoomLevel,
    setZoomLevel,
    panOffset,
    setPanOffset,
    resetPan,
    showMinimap,
    clampPan: (x, y, zoomValue) => getClampedPan(x, y, zoomValue, imageDrawInfo, canvasDimensions),
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', zoom.handleWheel, { passive: false })
    return () => {
      canvas.removeEventListener('wheel', zoom.handleWheel)
    }
  }, [zoom.handleWheel])

  const pan = usePanHandler({
    canvasRef,
    image,
    imageDrawInfo,
    canvasDimensions,
    zoomLevel,
    panOffset,
    setPanOffset,
    isSpaceDown: zoom.isSpaceDown,
    showMinimap,
  })

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

  useEffect(() => {
    const saved = localStorage.getItem('colorwizard_grid_settings')
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)
      setInternalGridEnabled(parsed.enabled ?? false)
      setGridPhysicalWidth(parsed.physicalWidth ?? 20)
      setGridPhysicalHeight(parsed.physicalHeight ?? 16)
      setGridSquareSize(parsed.squareSize ?? 1)
    } catch (error) {
      console.error('Failed to parse grid settings', error)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('colorwizard_grid_settings', JSON.stringify({
      enabled: internalGridEnabled,
      physicalWidth: gridPhysicalWidth,
      physicalHeight: gridPhysicalHeight,
      squareSize: gridSquareSize,
    }))
  }, [internalGridEnabled, gridPhysicalWidth, gridPhysicalHeight, gridSquareSize])

  useEffect(() => {
    sourceBufferRef.current = null
    setMetrics(null)
    setAnalysisSource(image)

    if (!image || image.width === 0 || image.height === 0) {
      return
    }

    const initSourceBuffer = async () => {
      try {
        const buffer = await createSourceBuffer(image)
        sourceBufferRef.current = buffer
        setAnalysisSource(buffer)
        setMetrics({
          originalWidth: image.width,
          originalHeight: image.height,
          bufferWidth: buffer.width,
          bufferHeight: buffer.height,
          displayWidth: canvasDimensions.width,
          displayHeight: canvasDimensions.height,
          dpr: window.devicePixelRatio || 1,
        })
      } catch (error) {
        console.error('[ImageCanvas] Source buffer creation failed:', error)
        sourceBufferRef.current = null
        setAnalysisSource(image)
      }
    }

    initSourceBuffer()
  }, [image, canvasDimensions.width, canvasDimensions.height])

  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    if (!canvasContainer) return

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

    if (!updateDimensions()) {
      requestAnimationFrame(() => {
        updateDimensions()
      })
    }

    const resizeObserver = new ResizeObserver(entries => {
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
  }, [hasRenderableImage])

  const initialFitKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const mainImg = image || surfaceImageElement
    if (!mainImg || mainImg.width === 0 || mainImg.height === 0) {
      initialFitKeyRef.current = null
      return
    }
    if (canvasDimensions.width === 0 || canvasDimensions.height === 0) return

    const fitKey = `${mainImg.src || 'inline'}:${mainImg.width}x${mainImg.height}:${canvasDimensions.width}x${canvasDimensions.height}`
    if (initialFitKeyRef.current === fitKey) return

    const raf = requestAnimationFrame(() => {
      const fittedInfo = calculateFit(
        { width: canvasDimensions.width, height: canvasDimensions.height },
        { width: mainImg.width, height: mainImg.height }
      )
      if (mobileSampleLayout) {
        fittedInfo.y = 0
      }
      setImageDrawInfo(fittedInfo)
      setZoomLevel(1)
      resetPan()
      initialFitKeyRef.current = fitKey
    })

    return () => cancelAnimationFrame(raf)
  }, [image, surfaceImageElement, canvasDimensions.width, canvasDimensions.height, resetPan, mobileSampleLayout])

  useEffect(() => {
    const mainImg = image || surfaceImageElement
    if (!mainImg) return
    if (canvasDimensions.width === 0 || canvasDimensions.height === 0) return

    const info = calculateFit(
      { width: canvasDimensions.width, height: canvasDimensions.height },
      { width: mainImg.width, height: mainImg.height }
    )
    if (mobileSampleLayout) {
      info.y = 0
    }
    setImageDrawInfo(info)
  }, [canvasDimensions.width, canvasDimensions.height, image, surfaceImageElement, mobileSampleLayout])

  const drawCanvas = useCallback(() => {
    drawMainCanvas({
      canvas: canvasRef.current,
      canvasDimensions,
      image,
      surfaceImageElement,
      imageDrawInfo,
      zoomLevel,
      panOffset,
      valueScaleSettings,
      referenceOpacity,
      referenceTransform,
      isGrayscale,
      splitMode,
      activeBreakdownStep,
      breakdownBuffers,
      gridEnabled,
      gridPhysicalWidth,
      gridPhysicalHeight,
      gridSquareSize,
      gridOpacity,
      overlayCanvas: overlayCanvasRef.current,
      valueMapCanvas: valueMapCanvasRef.current,
      breakdownCanvas: breakdownCanvasRef.current,
      sourceBuffer: sourceBufferRef.current,
      canvasSettings,
      showHighlightOverlay: !!highlightOverlay.imageData,
    })
  }, [
    canvasDimensions,
    image,
    surfaceImageElement,
    imageDrawInfo,
    zoomLevel,
    panOffset,
    valueScaleSettings,
    referenceOpacity,
    referenceTransform,
    isGrayscale,
    splitMode,
    activeBreakdownStep,
    breakdownBuffers,
    gridEnabled,
    gridPhysicalWidth,
    gridPhysicalHeight,
    gridSquareSize,
    gridOpacity,
    canvasSettings,
    highlightOverlay.imageData,
  ])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      if (!labBuffer || !highlightColor || !generateHighlightOverlay) {
        if (!isActive) return
        setHighlightOverlay({ imageData: null, width: 0, height: 0 })
        return
      }

      const overlayData = await generateHighlightOverlay(
        highlightColor.r,
        highlightColor.g,
        highlightColor.b,
        highlightTolerance ?? 20,
        highlightMode ?? 'solid'
      )

      if (!isActive || !overlayData) return

      setHighlightOverlay({
        imageData: overlayData,
        width: labBuffer.width,
        height: labBuffer.height,
      })
    }

    run()
    return () => {
      isActive = false
    }
  }, [labBuffer, highlightColor, highlightTolerance, highlightMode, generateHighlightOverlay])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas, highlightMode, highlightColor, highlightTolerance, highlightOverlay.imageData])

  useEffect(() => {
    if (onTransformChange && imageDrawInfo) {
      onTransformChange({ zoomLevel, panOffset, imageDrawInfo })
    }
  }, [zoomLevel, panOffset, imageDrawInfo, onTransformChange])

  const resetView = useCallback(() => {
    zoom.zoomToFit()
  }, [zoom])

  useImperativeHandle(ref, () => ({
    resetView,
  }))

  const performSampling = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || !image || !imageDrawInfo) return

    const canvasCoords = clientToCanvas(clientX, clientY, canvas)
    const color = sampleColor(canvasCoords.cssX, canvasCoords.cssY, canvas, {
      imageDrawInfo,
      zoomLevel,
      panOffset,
      sourceCanvas: sourceBufferRef.current,
      valueScaleResult,
      sortedLuminances,
      canvasCoords,
    })

    if (color) {
      onColorSample(color)
    }
  }, [image, imageDrawInfo, zoomLevel, panOffset, valueScaleResult, sortedLuminances, onColorSample])

  const measureStartPointRef = useRef<{ x: number; y: number } | null>(null)
  const isMeasuringRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const mouseLastPointRef = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return

    if (measureMode && e.button === 0 && !zoom.isSpaceDown) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const imagePoint = screenToImage(
        screenX,
        screenY,
        { zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined },
        image.width,
        image.height
      )
      if (imagePoint && onMeasurePointsChange) {
        isMeasuringRef.current = true
        measureStartPointRef.current = imagePoint
        onMeasurePointsChange(imagePoint, imagePoint)
      }
      return
    }

    pan.handleMouseDown(e)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    mouseLastPointRef.current = { x: e.clientX, y: e.clientY }
  }, [image, measureMode, zoom.isSpaceDown, zoomLevel, panOffset, imageDrawInfo, pan, onMeasurePointsChange])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return

    if (isMeasuringRef.current && onMeasurePointsChange && measureStartPointRef.current) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const imagePoint = screenToImage(
        screenX,
        screenY,
        { zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined },
        image.width,
        image.height
      )
      if (imagePoint) {
        onMeasurePointsChange(measureStartPointRef.current, imagePoint)
      }
      return
    }

    pan.handleMouseMove(e)
  }, [image, onMeasurePointsChange, zoomLevel, panOffset, imageDrawInfo, pan])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMeasuringRef.current) {
      isMeasuringRef.current = false
      return
    }

    pan.handleMouseUp(e)

    if (e.button === 0 && !pan.hasDragged && !zoom.isSpaceDown) {
      if (measureMode && onMeasureClick) {
        const canvas = canvasRef.current
        if (!canvas || !image) return

        const rect = canvas.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const imagePoint = screenToImage(
          screenX,
          screenY,
          { zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined },
          image.width,
          image.height
        )
        if (imagePoint) {
          onMeasureClick(imagePoint)
        }
      } else {
        performSampling(e.clientX, e.clientY)
      }
    }
  }, [pan, zoom.isSpaceDown, measureMode, onMeasureClick, performSampling, zoomLevel, panOffset, imageDrawInfo, image])

  const handleMouseLeave = useCallback(() => {
    pan.handleMouseLeave()
  }, [pan])

  const touchStateRef = useRef({
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 },
    isPinching: false,
    touchStartTime: 0,
    lastTapTime: 0,
    touchStartPos: { x: 0, y: 0 },
  })
  const activePointersRef = useRef<Map<number, PointerCoord>>(new Map())
  const touchLastPointRef = useRef<PointerCoord | null>(null)
  const touchHasDraggedRef = useRef(false)
  const skipNextSinglePointerSampleRef = useRef(false)

  const getPointerDistance = (p1: PointerCoord, p2: PointerCoord) =>
    Math.hypot(p1.x - p2.x, p1.y - p2.y)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'touch') return
    if (!image) return

    const canvas = canvasRef.current
    if (!canvas) return

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    canvas.setPointerCapture(e.pointerId)

    touchStateRef.current.touchStartTime = Date.now()
    touchStateRef.current.touchStartPos = { x: e.clientX, y: e.clientY }
    touchLastPointRef.current = { x: e.clientX, y: e.clientY }
    touchHasDraggedRef.current = false

    pan.handleTouchDown(e)
    zoom.handlePinchDown(e)

    const pointers = Array.from(activePointersRef.current.values())
    if (pointers.length === 2) {
      touchStateRef.current.isPinching = true
      skipNextSinglePointerSampleRef.current = true
      touchStateRef.current.lastDistance = getPointerDistance(pointers[0], pointers[1])
      const centerClientX = (pointers[0].x + pointers[1].x) / 2
      const centerClientY = (pointers[0].y + pointers[1].y) / 2
      const { cssX, cssY } = clientToCanvas(centerClientX, centerClientY, canvas)
      touchStateRef.current.lastCenter = { x: cssX, y: cssY }
      if (e.cancelable) e.preventDefault()
      return
    }

    if (pointers.length > 2) {
      touchStateRef.current.isPinching = false
      touchStateRef.current.lastDistance = 0
      touchStateRef.current.lastCenter = { x: 0, y: 0 }
      if (e.cancelable) e.preventDefault()
      return
    }

    touchStateRef.current.isPinching = false
    touchStateRef.current.lastDistance = 0
    touchStateRef.current.lastCenter = { x: 0, y: 0 }

    if (e.cancelable) e.preventDefault()
  }, [image, pan, zoom])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'touch') return
    if (!image) return

    const canvas = canvasRef.current
    if (!canvas) return
    if (!activePointersRef.current.has(e.pointerId)) return

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    pan.handleTouchMove(e)
    zoom.handlePinchMove(e)

    const pointers = Array.from(activePointersRef.current.values())
    if (pointers.length === 2) {
      touchStateRef.current.isPinching = true
      touchHasDraggedRef.current = true
      const newDistance = getPointerDistance(pointers[0], pointers[1])
      const centerClientX = (pointers[0].x + pointers[1].x) / 2
      const centerClientY = (pointers[0].y + pointers[1].y) / 2
      const { cssX, cssY } = clientToCanvas(centerClientX, centerClientY, canvas)
      touchStateRef.current.lastDistance = newDistance
      touchStateRef.current.lastCenter = { x: cssX, y: cssY }
      showMinimap()
      if (e.cancelable) e.preventDefault()
      return
    }

    touchStateRef.current.isPinching = false
    touchStateRef.current.lastDistance = 0
    touchStateRef.current.lastCenter = { x: 0, y: 0 }

    const currentPointer = pointers[0]
    if (!currentPointer) {
      if (e.cancelable) e.preventDefault()
      return
    }

    const movedDistance = Math.hypot(
      currentPointer.x - touchStateRef.current.touchStartPos.x,
      currentPointer.y - touchStateRef.current.touchStartPos.y,
    )

    if (!touchHasDraggedRef.current && movedDistance <= 3) {
      touchLastPointRef.current = currentPointer
      if (e.cancelable) e.preventDefault()
      return
    }

    touchHasDraggedRef.current = true
    const lastPoint = touchLastPointRef.current ?? currentPointer
    const deltaX = currentPointer.x - lastPoint.x
    const deltaY = currentPointer.y - lastPoint.y

    if (deltaX !== 0 || deltaY !== 0) {
      touchLastPointRef.current = currentPointer
      showMinimap()
    }

    if (e.cancelable) e.preventDefault()
  }, [image, pan, zoom, showMinimap])

  const handlePointerUpOrCancel = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'touch') return

    const canvas = canvasRef.current
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId)
    }

    activePointersRef.current.delete(e.pointerId)
    pan.handleTouchUpOrCancel(e)
    zoom.handlePinchUpOrCancel(e)

    const remainingPointers = Array.from(activePointersRef.current.values())
    const wasPinching = touchStateRef.current.isPinching

    if (remainingPointers.length === 1 && wasPinching) {
      const remaining = remainingPointers[0]
      skipNextSinglePointerSampleRef.current = true
      touchStateRef.current.touchStartPos = { ...remaining }
      touchLastPointRef.current = { ...remaining }
      touchHasDraggedRef.current = false
    }

    if (remainingPointers.length < 2) {
      touchStateRef.current.isPinching = false
      touchStateRef.current.lastDistance = 0
      touchStateRef.current.lastCenter = { x: 0, y: 0 }
    }

    if (remainingPointers.length === 0) {
      const shouldSample = !wasPinching && !touchHasDraggedRef.current && !skipNextSinglePointerSampleRef.current
      if (shouldSample && !measureMode) {
        const samplePoint = touchLastPointRef.current ?? { x: e.clientX, y: e.clientY }
        performSampling(samplePoint.x, samplePoint.y)
      }

      if (skipNextSinglePointerSampleRef.current) {
        skipNextSinglePointerSampleRef.current = false
      }

      touchHasDraggedRef.current = false
      touchLastPointRef.current = null
    }

    if (e.cancelable) e.preventDefault()
  }, [pan, zoom, performSampling, measureMode])

  useEffect(() => {
    const activePointers = activePointersRef.current
    return () => {
      activePointers.clear()
    }
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!image) return

    zoom.handleKeyDown(e)

    if (e.key.toLowerCase() === 'v' && !e.repeat) {
      if (onValueScaleChange && valueScaleSettings) {
        onValueScaleChange({
          ...valueScaleSettings,
          enabled: !valueScaleSettings.enabled,
        })
      }
    }

    if (e.key.toLowerCase() === 's' && !e.repeat) {
      setSplitMode(prev => !prev)
    }

    if (e.key.toLowerCase() === 'g' && !e.repeat) {
      setInternalGridEnabled(prev => !prev)
    }
  }, [image, zoom, onValueScaleChange, valueScaleSettings])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    zoom.handleKeyUp(e)
  }, [zoom])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  useEffect(() => {
    const canvas = breakdownCanvasRef.current
    if (!canvas || !breakdownBuffers || !labBuffer) return

    const stepToBuffer: Record<string, keyof typeof breakdownBuffers> = {
      Imprimatura: 'imprimatura',
      'Dead Color': 'deadColor',
      'Local Color': 'localColor',
      'Spectral Glaze': 'spectralGlaze',
    }

    const buffer = activeBreakdownStep !== 'Original' ? breakdownBuffers[stepToBuffer[activeBreakdownStep]] : null

    if (!buffer) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      drawCanvas()
      return
    }

    const { width, height } = labBuffer
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

  useEffect(() => {
    if (image && !isGeneratingBreakdown && !breakdownBuffers.imprimatura) {
      generateBreakdown()
    }
  }, [image, breakdownBuffers.imprimatura, isGeneratingBreakdown, generateBreakdown])

  const handleDirectFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file) return

    const isImageFile = (value: File): boolean => {
      if (value.type && value.type.startsWith('image/')) return true
      const extension = value.name.toLowerCase().split('.').pop()
      const imageExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
        'heic', 'heif', 'avif', 'tiff', 'tif', 'raw', 'cr2', 'nef', 'orf', 'sr2',
      ]
      return imageExtensions.includes(extension || '')
    }

    if (!isImageFile(file)) {
      console.error('[ImageCanvas] Invalid file type:', file.type, 'File:', file.name)
      alert(`"${file.name}" is not a supported image format. Please use JPEG, PNG, WebP, HEIC, or other common image formats.`)
      input.value = ''
      return
    }

    let processedFile = file

    const isHeic = file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif') ||
      file.type === 'image/heic' ||
      file.type === 'image/heif'

    if (isHeic) {
      if (typeof window === 'undefined' || typeof Blob === 'undefined') {
        console.error('[ImageCanvas] HEIC conversion requires browser environment')
        alert('HEIC conversion is not available in this environment. Please convert your image to JPEG first.')
        input.value = ''
        return
      }

      const maxHeicSize = 50 * 1024 * 1024
      if (file.size > maxHeicSize) {
        alert(`HEIC file is too large (${Math.round(file.size / 1024 / 1024)}MB). Please convert to JPEG first or use a smaller file.`)
        input.value = ''
        return
      }

      try {
        const heic2anyModule = await import('heic2any')
        const heic2any = heic2anyModule.default || heic2anyModule
        if (typeof heic2any !== 'function') {
          throw new Error(`heic2any is not a function: ${typeof heic2any}`)
        }

        if (typeof WebAssembly === 'undefined') {
          throw new Error('WebAssembly is not supported in this browser. HEIC conversion requires WebAssembly support.')
        }

        const conversionPromise = heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.95,
        })

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('HEIC conversion timed out after 30 seconds')), 30000)
        )

        const convertedBlob = await Promise.race([conversionPromise, timeoutPromise])
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob

        if (!(blob instanceof Blob) || blob.size === 0) {
          throw new Error('HEIC conversion returned an invalid blob')
        }

        processedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
          type: 'image/jpeg',
        })
      } catch (error) {
        console.error('[ImageCanvas] HEIC conversion failed:', error)
        alert('Failed to convert HEIC image. Please convert the image to JPEG first or try a smaller HEIC file.')
        input.value = ''
        return
      }
    }

    const objectUrl = URL.createObjectURL(processedFile)
    const img = new Image()
    const cleanup = () => URL.revokeObjectURL(objectUrl)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        try {
          img.src = canvas.toDataURL('image/png')
        } catch {
          // Keep blob URL alive if conversion fails.
        }
      }

      onImageLoad(img)
      if (img.src.startsWith('data:')) {
        cleanup()
      }
    }

    img.onerror = () => {
      console.error('[ImageCanvas] Direct image load error:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      })
      cleanup()
    }

    img.src = objectUrl
    input.value = ''
  }, [onImageLoad])

  const getCursorStyle = () => {
    if (pan.isPanning) return 'grabbing'
    if (zoom.isSpaceDown) return 'grab'
    return 'crosshair'
  }

  useEffect(() => {
    if (!image) return

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
        'height === 0': canvasDimensions.height === 0,
      },
    }
    const logMsg = `🔍 Render: ${image.width}x${image.height}, fallback=${shouldShowFallback}`
    console.log('[ImageCanvas]', logMsg, renderState)
  }, [image, surfaceImage, canvasDimensions, imageDrawInfo])

  return (
    <div className="flex h-full min-h-0 flex-col" ref={containerRef}>
      <DebugOverlay isVisible={debugModeEnabled} metrics={metrics} />
      {!image && !surfaceImage ? (
        <ImageDropzone onImageLoad={onImageLoad} />
      ) : (
        <div className={`${mobileSampleLayout ? 'flex min-h-0 flex-col' : 'flex-1 flex min-h-0 flex-col'}`}>
          <div
            ref={canvasContainerRef}
            className={`canvas-viewport ${mobileSampleLayout ? 'h-[clamp(15rem,34dvh,21rem)] flex-none rounded-[16px] border border-ink-hairline' : 'flex-1 min-h-0 md:rounded-[18px] md:border'} relative overflow-hidden overscroll-contain select-none border-ink-hairline bg-paper-recessed`}
          >
            {showHud && (
              <CanvasHUD
                valueOverlayEnabled={valueScaleSettings?.enabled ?? false}
                splitViewEnabled={splitMode}
                gridEnabled={gridEnabled}
                measureEnabled={measureMode || false}
                zoomLevel={zoomLevel}
                liveColorHex={sampledColorHex}
                workspaceModeLabel={workspaceModeLabel}
              />
            )}

            {isAnalyzing && (
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-lg border border-ink-hairline bg-paper-elevated/92 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-secondary shadow-[0_12px_28px_rgba(26,26,26,0.14)] backdrop-blur-md">
                <div className="w-3 h-3 border border-ink-muted border-t-transparent rounded-full animate-spin" />
                Working
              </div>
            )}

            <div className={`${mobileSampleLayout ? 'absolute right-2 top-2 z-20' : 'absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-xl border border-ink-hairline bg-paper-elevated/88 p-1 shadow-[0_12px_28px_rgba(26,26,26,0.14)] backdrop-blur-md'}`}>
              {!isMobile && (
                <>
                  <label
                    htmlFor={desktopFileInputId}
                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-paper text-ink-secondary transition-colors hover:text-ink"
                    title="Load image"
                    aria-label="Load image"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 16V7" />
                      <path d="m8 11 4-4 4 4" />
                      <path d="M20 17v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1" />
                    </svg>
                  </label>
                  <input
                    id={desktopFileInputId}
                    type="file"
                    accept="image/*,.heic,.heif,.webp,.avif,.tiff,.tif,.bmp,.raw,.cr2,.nef,.orf,.sr2"
                    onChange={handleDirectFileInput}
                    className="sr-only"
                  />
                </>
              )}

              <button
                onClick={() => setShowImageFullScreen(true)}
                className={`${mobileSampleLayout
                  ? 'flex h-10 w-10 items-center justify-center rounded-lg border border-ink-hairline bg-paper-elevated/90 text-ink-secondary shadow-[0_8px_20px_rgba(26,26,26,0.12)] backdrop-blur-md transition-colors hover:text-ink'
                  : 'flex h-9 w-9 items-center justify-center rounded-lg bg-paper text-ink-secondary transition-colors hover:text-ink'
                }`}
                title="Full screen"
                aria-label="Full screen"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h6v6" />
                  <path d="M9 21H3v-6" />
                  <path d="M21 3l-7 7" />
                  <path d="M3 21l7-7" />
                </svg>
              </button>
            </div>

            <canvas
              ref={canvasRef}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
              onContextMenu={e => e.preventDefault()}
              className="absolute top-0 left-0 w-full h-full touch-none select-none"
              style={{
                cursor: getCursorStyle(),
                zIndex: imageDrawInfo ? 60 : 5,
                backgroundColor: imageDrawInfo ? 'transparent' : 'transparent',
                pointerEvents: imageDrawInfo ? 'auto' : 'none',
                touchAction: 'none',
                overscrollBehavior: 'contain',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            />

            <HighlightOverlay
              ref={overlayCanvasRef}
              imageData={highlightOverlay.imageData}
              width={highlightOverlay.width}
              height={highlightOverlay.height}
              onRendered={drawCanvas}
            />
            <ValueOverlay
              ref={valueMapCanvasRef}
              valueBuffer={valueBuffer}
              enabled={valueScaleSettings?.enabled ?? false}
              valueScaleResult={valueScaleResult}
              onRendered={drawCanvas}
            />
            <canvas ref={breakdownCanvasRef} id="breakdown-canvas" style={{ display: 'none' }} />

            <RulerOverlay
              gridEnabled={gridEnabledProp || false}
              gridSpacing={gridSpacing || 1}
              gridOpacity={gridOpacity}
              calibration={calibration || null}
              measureEnabled={measureMode || false}
              measurePointA={measurePointA}
              measurePointB={measurePointB}
              containerRef={canvasContainerRef}
              onMeasurePointsChange={onMeasurePointsChange}
              transformState={{ zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined }}
              measurementLayer={measurementLayer}
              image={image || surfaceImageElement}
              canvasSettings={canvasSettings}
            />

            <NavigatorMinimap
              image={image}
              transform={{ zoomLevel, panOffset, imageDrawInfo: imageDrawInfo || undefined }}
              canvasDimensions={canvasDimensions}
              isVisible={minimapVisible}
            />

            {!isMobile && (
              <div className="absolute bottom-4 left-4 z-20">
                <ZoomControlsBar
                  zoomLevel={zoomLevel}
                  onZoomIn={zoom.zoomIn}
                  onZoomOut={zoom.zoomOut}
                  onFit={resetView}
                  minZoom={MIN_ZOOM}
                  maxZoom={MAX_ZOOM}
                />
              </div>
            )}
          </div>

          <input
            id={mobileFileInputId}
            type="file"
            accept="image/*,.heic,.heif,.webp,.avif,.tiff,.tif,.bmp,.raw,.cr2,.nef,.orf,.sr2"
            onChange={handleDirectFileInput}
            className="sr-only"
          />
        </div>
      )}

      <FullScreenOverlay
        isOpen={showImageFullScreen && !suppressPreviewOverlay}
        onClose={() => setShowImageFullScreen(false)}
      >
        {image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image.src}
            alt="Full screen reference"
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        )}
      </FullScreenOverlay>
    </div>
  )
})

ImageCanvas.displayName = 'ImageCanvas'

export default ImageCanvas
