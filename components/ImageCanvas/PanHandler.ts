'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { DRAG_THRESHOLD, getClampedPan } from './CanvasRenderer'
import type { ImageDrawInfo } from './types'

interface PanHandlerOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>
  image: HTMLImageElement | null
  imageDrawInfo: ImageDrawInfo | null
  canvasDimensions: { width: number; height: number }
  zoomLevel: number
  panOffset: { x: number; y: number }
  setPanOffset: Dispatch<SetStateAction<{ x: number; y: number }>>
  isSpaceDown: boolean
  showMinimap?: () => void
}

interface PointerCoord {
  x: number
  y: number
}

export interface PanHandlerResult {
  panOffset: { x: number; y: number }
  setPanOffset: Dispatch<SetStateAction<{ x: number; y: number }>>
  pan: (deltaX: number, deltaY: number) => void
  resetPan: () => void
  isPanning: boolean
  hasDragged: boolean
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleMouseLeave: () => void
  handleTouchDown: (e: React.PointerEvent<HTMLCanvasElement>) => void
  handleTouchMove: (e: React.PointerEvent<HTMLCanvasElement>) => void
  handleTouchUpOrCancel: (e: React.PointerEvent<HTMLCanvasElement>) => void
}

export function usePanHandler(options: PanHandlerOptions): PanHandlerResult {
  const {
    canvasRef,
    image,
    imageDrawInfo,
    canvasDimensions,
    zoomLevel,
    panOffset,
    setPanOffset,
    isSpaceDown,
    showMinimap,
  } = options

  const [isPanning, setIsPanning] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const lastPanPoint = useRef({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const hasDraggedRef = useRef(false)

  const touchLastPointRef = useRef<PointerCoord | null>(null)
  const touchHasDraggedRef = useRef(false)
  const activeTouchPointersRef = useRef<Map<number, PointerCoord>>(new Map())

  const clamp = useCallback(
    (x: number, y: number, zoom: number) =>
      getClampedPan(x, y, zoom, imageDrawInfo, canvasDimensions),
    [imageDrawInfo, canvasDimensions]
  )

  const pan = useCallback((deltaX: number, deltaY: number) => {
    setPanOffset(prev => clamp(prev.x + deltaX, prev.y + deltaY, zoomLevel))
  }, [clamp, zoomLevel, setPanOffset])

  const resetPan = useCallback(() => {
    setPanOffset({ x: 0, y: 0 })
  }, [setPanOffset])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return

    if (e.button === 0 || e.button === 1 || isSpaceDown) {
      e.preventDefault()
      setIsPanning(true)
      setHasDragged(false)
      lastPanPoint.current = { x: e.clientX, y: e.clientY }
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      hasDraggedRef.current = false
    }
  }, [image, isSpaceDown])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image || !isPanning) return

    if (!hasDraggedRef.current) {
      const dist = Math.hypot(
        e.clientX - dragStartRef.current.x,
        e.clientY - dragStartRef.current.y
      )
      if (dist > DRAG_THRESHOLD) {
        hasDraggedRef.current = true
        setHasDragged(true)
      }
    }

    const deltaX = e.clientX - lastPanPoint.current.x
    const deltaY = e.clientY - lastPanPoint.current.y

    setPanOffset(prev => clamp(prev.x + deltaX, prev.y + deltaY, zoomLevel))
    lastPanPoint.current = { x: e.clientX, y: e.clientY }
    showMinimap?.()
  }, [image, isPanning, clamp, zoomLevel, setPanOffset, showMinimap])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setHasDragged(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false)
    setHasDragged(false)
  }, [])

  const handleTouchDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'touch' || !image) return

    const canvas = canvasRef.current
    if (!canvas) return

    activeTouchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    canvas.setPointerCapture(e.pointerId)

    const pointers = Array.from(activeTouchPointersRef.current.values())
    if (pointers.length > 1) {
      touchHasDraggedRef.current = false
      touchLastPointRef.current = null
      setIsPanning(false)
      setHasDragged(false)
      if (e.cancelable) e.preventDefault()
      return
    }

    touchLastPointRef.current = { x: e.clientX, y: e.clientY }
    touchHasDraggedRef.current = false
    setIsPanning(false)
    setHasDragged(false)

    if (e.cancelable) e.preventDefault()
  }, [canvasRef, image])

  const handleTouchMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'touch' || !image) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (!activeTouchPointersRef.current.has(e.pointerId)) return

    activeTouchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pointers = Array.from(activeTouchPointersRef.current.values())

    if (pointers.length > 1) {
      if (e.cancelable) e.preventDefault()
      setIsPanning(false)
      return
    }

    const currentPointer = pointers[0]
    if (!currentPointer) {
      if (e.cancelable) e.preventDefault()
      return
    }

    const movedDistance = Math.hypot(
      currentPointer.x - (touchLastPointRef.current?.x ?? currentPointer.x),
      currentPointer.y - (touchLastPointRef.current?.y ?? currentPointer.y)
    )

    if (!touchHasDraggedRef.current && movedDistance <= DRAG_THRESHOLD) {
      touchLastPointRef.current = currentPointer
      if (e.cancelable) e.preventDefault()
      return
    }

    touchHasDraggedRef.current = true
    setIsPanning(true)
    setHasDragged(true)

    const lastPoint = touchLastPointRef.current ?? currentPointer
    const deltaX = currentPointer.x - lastPoint.x
    const deltaY = currentPointer.y - lastPoint.y

    if (deltaX !== 0 || deltaY !== 0) {
      setPanOffset(prev => clamp(prev.x + deltaX, prev.y + deltaY, zoomLevel))
      showMinimap?.()
    }

    touchLastPointRef.current = currentPointer

    if (e.cancelable) e.preventDefault()
  }, [canvasRef, image, clamp, zoomLevel, setPanOffset, showMinimap])

  const handleTouchUpOrCancel = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'touch') return

    const canvas = canvasRef.current
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId)
    }

    activeTouchPointersRef.current.delete(e.pointerId)

    if (activeTouchPointersRef.current.size === 0) {
      touchHasDraggedRef.current = false
      touchLastPointRef.current = null
      setIsPanning(false)
      setHasDragged(false)
    }

    if (e.cancelable) e.preventDefault()
  }, [canvasRef])

  useEffect(() => {
    const activeTouchPointers = activeTouchPointersRef.current
    return () => {
      activeTouchPointers.clear()
    }
  }, [])

  return {
    panOffset,
    setPanOffset,
    pan,
    resetPan,
    isPanning,
    hasDragged,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchDown,
    handleTouchMove,
    handleTouchUpOrCancel,
  }
}
