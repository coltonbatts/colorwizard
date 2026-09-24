'use client'

/** The photographed skein, recolored to one exact thread color. */

import { useEffect, useRef, useState } from 'react'
import { colorizeFloss, loadFlossTemplate, type FlossTemplate } from './floss'

export default function FlossImage({ hex, className }: { hex: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [template, setTemplate] = useState<FlossTemplate | null>(null)

  useEffect(() => {
    let cancelled = false
    loadFlossTemplate()
      .then((loaded) => { if (!cancelled) setTemplate(loaded) })
      .catch((error) => console.error('[floss]', error))
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !template) return
    canvas.width = template.width
    canvas.height = template.height
    canvas.getContext('2d')?.putImageData(colorizeFloss(template, hex), 0, 0)
  }, [hex, template])

  return <canvas ref={canvasRef} className={className} width={109} height={834} aria-hidden="true" />
}
