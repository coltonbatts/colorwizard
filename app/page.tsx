'use client'

import { useState } from 'react'
import ImageCanvas from '@/components/ImageCanvas'
import ColorPanel from '@/components/ColorPanel'

export default function Home() {
  const [sampledColor, setSampledColor] = useState<{
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
  } | null>(null)

  return (
    <main className="flex h-screen bg-[#1a1a1a]">
      <div className="w-[70%] p-6">
        <ImageCanvas onColorSample={setSampledColor} />
      </div>
      <div className="w-[30%] border-l border-gray-700">
        <ColorPanel sampledColor={sampledColor} />
      </div>
    </main>
  )
}
