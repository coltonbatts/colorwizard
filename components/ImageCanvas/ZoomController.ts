'use client'

import { useCallback, useEffect, useRef, useState, type RefObject, type Dispatch, type SetStateAction } from 'react'
import { clientToCanvas, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, ZOOM_WHEEL_SENSITIVITY } from './CanvasRenderer'

interface ZoomControllerOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>
  image: HTMLImageElement | null
  zoomLevel: number
  setZoomLevel: Dispatch<SetStateAction<number>>
  panOffset: { x: number; y: number }
  setPanOffset: Dispatch<SetStateAction<{ x: number; y: number }>>
  resetPan: () => void
  showMinimap?: () => void
  clampPan?: (x: number, y: number, zoom: number) => { x: number; y: number }
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
  wheelSensitivity?: number
}

interface PointerCoord {
  x: number
  y: number
}

const getPointerDistance = (p1: PointerCoord, p2: PointerCoord) =>
  Math.hypot(p1.x - p2.x, p1.y - p2.y)

export interface ZoomControllerResult {
  zoomLevel: number
  setZoom: (level: number) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
  zoomAtPoint: (newZoom: number, centerX: number, centerY: number) => void
  isSpaceDown: boolean
  handleWheel: (e: WheelEvent) => void
  handleKeyDown: (e: KeyboardEvent) => void
  handleKeyUp: (e: KeyboardEvent) => void
  handlePinchDown: (e: React.PointerEvent<HTMLCanvasElement>) => void
  handlePinchMove: (e: React.PointerEvent<HTMLCanvasElement>) => void
  handlePinchUpOrCancel: (e: React.PointerEvent<HTMLCanvasElement>) => void
}

export function useZoomController(options: ZoomControllerOptions): ZoomControllerResult {
  const {
    canvasRef,
    image,
    zoomLevel,
    setZoomLevel,
    panOffset,
    setPanOffset,
    resetPan,
    showMinimap,
    clampPan,
    minZoom = MIN_ZOOM,
    maxZoom = MAX_ZOOM,
    zoomStep = ZOOM_STEP,
    wheelSensitivity = ZOOM_WHEEL_SENSITIVITY,
  } = options

  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const activePointersRef = useRef<Map<number, PointerCoord>>(new Map())
  const touchStateRef = useRef({
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 },
    isPinching: false,
  })

  const zoomAtPoint = useCallback(
    (newZoom: number, centerX: number, centerY: number) => {
      const clampedZoom = Math.min(maxZoom, Math.max(minZoom, newZoom))
      const zoomRatio = clampedZoom / zoomLevel

      const newPanX = centerX - (centerX - panOffset.x) * zoomRatio
      const newPanY = centerY - (centerY - panOffset.y) * zoomRatio

      setZoomLevel(clampedZoom)
      const next = { x: newPanX, y: newPanY }
      setPanOffset(clampPan ? clampPan(next.x, next.y, clampedZoom) : next)
    },
    [zoomLevel, panOffset, setPanOffset, setZoomLevel, clampPan, maxZoom, minZoom]
  )

  const setZoom = useCallback((level: number) => {
    setZoomLevel(Math.min(maxZoom, Math.max(minZoom, level)))
  }, [maxZoom, minZoom, setZoomLevel])

  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    zoomAtPoint(zoomLevel + zoomStep, rect.width / 2, rect.height / 2)
  }, [canvasRef, zoomAtPoint, zoomLevel, zoomStep])

  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    zoomAtPoint(zoomLevel - zoomStep, rect.width / 2, rect.height / 2)
  }, [canvasRef, zoomAtPoint, zoomLevel, zoomStep])

  const zoomToFit = useCallback(() => {
    setZoomLevel(1)
    resetPan()
  }, [resetPan, setZoomLevel])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!image) return
      e.preventDefault()

      const canvas = canvasRef.current
      if (!canvas) return

      const { cssX, cssY } = clientToCanvas(e.clientX, e.clientY, canvas)
      const delta = -e.deltaY * wheelSensitivity
      const newZoom = zoomLevel * (1 + delta)

      zoomAtPoint(newZoom, cssX, cssY)
      showMinimap?.()
    },
    [image, canvasRef, zoomLevel, zoomAtPoint, wheelSensitivity, showMinimap]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!image) return

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpaceDown(true)
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        const canvas = canvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          zoomAtPoint(zoomLevel + zoomStep, rect.width / 2, rect.height / 2)
        }
      }

      if (e.key === '-') {
        e.preventDefault()
        const canvas = canvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          zoomAtPoint(zoomLevel - zoomStep, rect.width / 2, rect.height / 2)
        }
      }

      if (e.key === '0') {
        e.preventDefault()
        zoomToFit()
      }
    },
    [image, canvasRef, zoomLevel, zoomAtPoint, zoomStep, zoomToFit]
  )

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setIsSpaceDown(false)
    }
  }, [])

  const handlePinchDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'touch' || !image) return
    const canvas = canvasRef.current
    if (!canvas) return

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    canvas.setPointerCapture(e.pointerId)

    const pointers = Array.from(activePointersRef.current.values())

    if (pointers.length === 2) {
      touchStateRef.current.isPinching = true
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
  }, [canvasRef, image])

  const handlePinchMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'touch' || !image) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (!activePointersRef.current.has(e.pointerId)) return

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pointers = Array.from(activePointersRef.current.values())

    if (pointers.length !== 2) {
      if (e.cancelable) e.preventDefault()
      return
    }

    if (e.cancelable) e.preventDefault()

    touchStateRef.current.isPinching = true
    const newDistance = getPointerDistance(pointers[0], pointers[1])
    const centerClientX = (pointers[0].x + pointers[1].x) / 2
    const centerClientY = (pointers[0].y + pointers[1].y) / 2
    const { cssX, cssY } = clientToCanvas(centerClientX, centerClientY, canvas)
    const newCenter = { x: cssX, y: cssY }

    if (touchStateRef.current.lastDistance > 0) {
      const zoomDelta = newDistance / touchStateRef.current.lastDistance
      const targetZoom = Math.min(maxZoom, Math.max(minZoom, zoomLevel * zoomDelta))
      const zoomRatio = targetZoom / zoomLevel

      const newPanX = newCenter.x - (newCenter.x - panOffset.x) * zoomRatio
      const newPanY = newCenter.y - (newCenter.y - panOffset.y) * zoomRatio

      const panDeltaX = newCenter.x - touchStateRef.current.lastCenter.x
      const panDeltaY = newCenter.y - touchStateRef.current.lastCenter.y

      setZoomLevel(targetZoom)
      const nextPan = clampPan
        ? clampPan(newPanX + panDeltaX, newPanY + panDeltaY, targetZoom)
        : { x: newPanX + panDeltaX, y: newPanY + panDeltaY }
      setPanOffset(nextPan)
      showMinimap?.()
    }

    touchStateRef.current.lastDistance = newDistance
    touchStateRef.current.lastCenter = newCenter
  }, [canvasRef, image, zoomLevel, panOffset, setPanOffset, setZoomLevel, clampPan, maxZoom, minZoom, showMinimap])

  const handlePinchUpOrCancel = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'touch') return

    const canvas = canvasRef.current
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId)
    }

    activePointersRef.current.delete(e.pointerId)
    const remainingPointers = Array.from(activePointersRef.current.values())

    if (remainingPointers.length < 2) {
      touchStateRef.current.isPinching = false
      touchStateRef.current.lastDistance = 0
      touchStateRef.current.lastCenter = { x: 0, y: 0 }
    }

    if (e.cancelable) e.preventDefault()
  }, [canvasRef])

  useEffect(() => {
    const activePointers = activePointersRef.current
    return () => {
      activePointers.clear()
    }
  }, [])

  return {
    zoomLevel,
    setZoom,
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomAtPoint,
    isSpaceDown,
    handleWheel,
    handleKeyDown,
    handleKeyUp,
    handlePinchDown,
    handlePinchMove,
    handlePinchUpOrCancel,
  }
}
