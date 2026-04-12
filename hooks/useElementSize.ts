'use client'

import { useEffect, useState, useRef } from 'react'

export interface ElementSize {
  width: number
  height: number
}

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let frame = 0
    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      setSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => updateSize()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updateSize)
    })

    observer.observe(element)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return { ref, size }
}

