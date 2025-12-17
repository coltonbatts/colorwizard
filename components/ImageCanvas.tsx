'use client'

import { useRef, useState, useEffect } from 'react'

interface ColorData {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
}

interface ImageCanvasProps {
  onColorSample: (color: ColorData) => void
}

export default function ImageCanvas({ onColorSample }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Draw image on canvas when image changes
  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Calculate scaled dimensions to fit canvas while maintaining aspect ratio
      const maxWidth = canvas.width
      const maxHeight = canvas.height
      let width = image.width
      let height = image.height

      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width = width * ratio
      height = height * ratio

      // Clear canvas and draw image centered
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const x = (canvas.width - width) / 2
      const y = (canvas.height - height) / 2
      ctx.drawImage(image, x, y, width, height)
    }
  }, [image])

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
        setImage(img)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Get pixel data
    const pixelData = ctx.getImageData(x, y, 1, 1).data
    const r = pixelData[0]
    const g = pixelData[1]
    const b = pixelData[2]

    // Convert to hex
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`

    // Convert to HSL
    const hsl = rgbToHsl(r, g, b)

    onColorSample({
      hex,
      rgb: { r, g, b },
      hsl,
    })
  }

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6 text-gray-100">Color Wizard</h1>

      {!image ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
            isDragging
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
          <canvas
            ref={canvasRef}
            width={1000}
            height={700}
            onClick={handleCanvasClick}
            className="border border-gray-700 rounded-lg cursor-crosshair bg-gray-900"
          />
          <button
            onClick={() => setImage(null)}
            className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            Load New Image
          </button>
        </div>
      )}
    </div>
  )
}
