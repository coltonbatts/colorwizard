'use client'

import { useEffect, useRef } from 'react'
import { COLOR_WHEEL_SEGMENTS, ColorWheelSegment, RGB, rgbToHsl } from '@/lib/colorTheory'

interface ColorWheelDisplayProps {
    sampledColor: { rgb: RGB } | null
    highlightedIndex: number | null
    onSegmentClick?: (segment: ColorWheelSegment, index: number) => void
}

export default function ColorWheelDisplay({
    sampledColor,
    highlightedIndex,
    onSegmentClick
}: ColorWheelDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const wheelSize = 300
    const radius = wheelSize / 2

    // Handle clicks
    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!onSegmentClick) return

        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        const x = e.clientX - rect.left - radius
        const y = e.clientY - rect.top - radius

        // Calculate angle in degrees, adjusted so -90 (top) is 0
        let angle = Math.atan2(y, x) * (180 / Math.PI)
        // atan2: 0 is right (3 o'clock), -90 is top.
        // We want 0 at top. 
        // 0 -> 90
        // -90 -> 0
        // -180 -> -90
        // 90 -> 180

        // Convert to 0-360 starting from top clockwise
        // atan2 is -180 to 180.
        // x positive, y positive = 0 to 90

        let hueAngle = angle + 90
        if (hueAngle < 0) hueAngle += 360

        // Map 0-360 to 0-11 index
        const index = Math.floor(hueAngle / 30) % 12

        // Ensure within bounds just in case
        const safeIndex = Math.max(0, Math.min(11, index))

        onSegmentClick(COLOR_WHEEL_SEGMENTS[safeIndex], safeIndex)
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return

        // Helper to get hue from angle based on RYB segments
        // We implicitly assume the wheel is rotated so segment 0 starts at -90deg (top)
        // Segment 0 center is at -75deg.
        // We interpolate between segment centers.

        const segmentCenters = COLOR_WHEEL_SEGMENTS.map((s, i) => ({
            index: i,
            angleDeg: (i * 30) - 75, // Center of the 30deg slice starting at -90
            hue: s.hue
        }))

        // Normalize angles to 0-360 where 0 is -90 (Top) for easier math? 
        // Or just standard degrees.
        // Let's us standard 0-360 relative to Top (-90) being 0.
        // Segment 0 start: 0. Center: 15. End: 30.
        // Segment 1 start: 30. Center: 45.
        // ...
        // This is easier.
        // AngleRelTop = (AngleStd + 90) % 360.

        const getInterpolatedHue = (angleRelTop: number) => {
            // Find which segment center we are between.
            // Centers are at 15, 45, 75...
            // Formula: Center(i) = i*30 + 15.

            // We need to find i such that Center(i) <= angle < Center(i+1)
            // But wrap around at 360. 
            // Center(11) = 345. Center(0) = 15.
            // If angle > 345 or angle < 15, we are between 11 and 0.

            let normalized = angleRelTop
            if (normalized < 0) normalized += 360

            // Shift so Center 0 is at 0? No.

            // Locate lower bound segment
            // (angle - 15) / 30
            // e.g. angle 15 -> index 0.
            // angle 45 -> index 1.
            // angle 30 -> index 0.5 (between 0 and 1).

            // calc rough index
            let floatIndex = (normalized - 15) / 30
            // Handle wrap for pure local math
            // If angle is 10 (between 345 and 15), floatIndex = -0.16. 
            // floor is -1 -> index 11.

            let idx1 = Math.floor(floatIndex)
            let idx2 = idx1 + 1

            // Wrap indices
            let i1 = (idx1 + 12) % 12
            let i2 = (idx2 + 12) % 12

            // Fraction
            let t = floatIndex - idx1
            // at angle 15: floatIndex 0. t = 0. Hue = Hue(0).
            // at angle 45: floatIndex 1. t = 0. Hue = Hue(1).
            // at angle 30: floatIndex 0.5. t = 0.5.

            let h1 = COLOR_WHEEL_SEGMENTS[i1].hue
            let h2 = COLOR_WHEEL_SEGMENTS[i2].hue

            // Shortest path interpolation
            let diff = h2 - h1
            if (diff > 180) diff -= 360
            if (diff < -180) diff += 360

            let h = h1 + diff * t
            if (h < 0) h += 360
            if (h >= 360) h -= 360

            return h
        }

        // 1. Draw the gradient wheel
        const imageData = ctx.createImageData(wheelSize, wheelSize)
        const data = imageData.data
        const cx = wheelSize / 2
        const cy = wheelSize / 2

        for (let y = 0; y < wheelSize; y++) {
            for (let x = 0; x < wheelSize; x++) {
                const dx = x - cx
                const dy = y - cy
                const dist = Math.sqrt(dx * dx + dy * dy)

                // Keep strictly within circle
                if (dist > radius - 1) {
                    continue
                }

                // Angle calculations
                let angleRaw = Math.atan2(dy, dx) * (180 / Math.PI) // -180 to 180
                // Convert to 0-360 relative to Top (-90)
                let angleRelTop = angleRaw + 90
                if (angleRelTop < 0) angleRelTop += 360

                // Get RYB-interpolated hue
                const hue = getInterpolatedHue(angleRelTop)

                // Saturation: 0 at center, 100 at edge
                // dist 0 -> 0%, dist radius -> 100%
                const saturation = (dist / radius) * 100

                // Lightness: 
                // We want to simulate the "Color to Gray" scale. 
                // In HSL, Gray is S=0, L=any. 
                // But pure colors usually L=50.
                // If we keep L=50, center is Gray. Edge is Pure Color.
                // This matches "Desaturated/Gray (inner rings)" requirement.
                const lightness = 50

                // HSL to RGB conversion
                const s = saturation / 100
                const l = lightness / 100
                const c = (1 - Math.abs(2 * l - 1)) * s
                const xVal = c * (1 - Math.abs(((hue / 60) % 2) - 1))
                const m = l - c / 2

                let r, g, b
                if (hue < 60) { r = c; g = xVal; b = 0 }
                else if (hue < 120) { r = xVal; g = c; b = 0 }
                else if (hue < 180) { r = 0; g = c; b = xVal }
                else if (hue < 240) { r = 0; g = xVal; b = c }
                else if (hue < 300) { r = xVal; g = 0; b = c }
                else { r = c; g = 0; b = xVal }

                const idx = (y * wheelSize + x) * 4
                data[idx] = (r + m) * 255
                data[idx + 1] = (g + m) * 255
                data[idx + 2] = (b + m) * 255
                data[idx + 3] = 255 // Alpha
            }
        }

        ctx.putImageData(imageData, 0, 0)

        // 2. Draw Highlight Overlay (if any)
        if (highlightedIndex !== null) {
            const segmentAngle = 360 / 12
            // Start angle for index 0 is -90
            // index * 30 - 90
            const startAngleDeg = highlightedIndex * segmentAngle - 90
            const endAngleDeg = startAngleDeg + segmentAngle

            const startRad = startAngleDeg * Math.PI / 180
            const endRad = endAngleDeg * Math.PI / 180

            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.arc(cx, cy, radius, startRad, endRad)
            ctx.closePath()

            // Use a blend mode or semi-transparent white?
            // "Highlight"
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
            ctx.fill()
            ctx.strokeStyle = 'white'
            ctx.lineWidth = 2
            ctx.stroke()
        }

        // 3. Draw Sampled Color Marker
        if (sampledColor) {
            const hsl = rgbToHsl(sampledColor.rgb.r, sampledColor.rgb.g, sampledColor.rgb.b)

            // TO DO: We need to reverse map the Hue to the Angle on our warped wheel!
            // If we just plot at "True HSL Angle", it won't match the background color if we warped it.
            // Since we warped the background to match segments...
            // The marker should probably also respect that warp? 
            // OR the marker shows the "True HSL Physics" vs "Artist Wheel"?
            // If the user picked a color from the image, and it is "True Green (120)",
            // On our wheel, Green (120) is at Bottom (180 deg).
            // If we plot it at 120 deg (4 o'clock), it will land on Yellow-Green (90).
            // So we MUST warp the marker position too unless we want confusion.

            // Reverse mapping: Hue -> AngleRelTop
            // We need to find which "segment interval" this Hue belongs to.
            // The intervals are defined by the Segment Centers? Or Start/Ends?
            // our getInterpolatedHue used Centers: 0 (at 15deg), 30 (at 45deg)...
            // So we linearly interpolated Hues between 15deg, 45deg, etc.

            // Inverse: Find i such that Hue is between Hue(i) and Hue(i+1).
            // Then t = (Hue - Hue(i)) / (Hue(i+1) - Hue(i)).
            // Then Angle = Center(i) + t * 30.

            // Problem: Hues are not monotonic 0-360 because of "Orange=30, RedOrange=30".
            // If Hue is 30, it could be anywhere between -45 and -15?
            // This ambiguity implies we map to the center of that range?
            // Or just pick one.

            // Implementation: Scan segments to find the interval.
            // Since we know the ordered hues: 0, 30, 30, 45, 60, 90, 120, 160, 210, 260, 280, 320.
            // Note: 160 -> 210 -> 260 -> 280 -> 320 -> 0.

            // For a given Hue h:
            // Find i where Hue(i) <= h <= Hue(i+1). 
            // Handle wrap.

            const findAngleForHue = (h: number): number => {
                // Simple scan
                for (let i = 0; i < 12; i++) {
                    const h1 = COLOR_WHEEL_SEGMENTS[i].hue
                    const h2 = COLOR_WHEEL_SEGMENTS[(i + 1) % 12].hue

                    // Check if h is between h1 and h2 (handling wrap)
                    let diff = h2 - h1
                    if (diff < 0) diff += 360 // Normalize diff to be positive

                    let val = h - h1
                    if (val < 0) val += 360 // Normalize val to be positive relative to h1

                    // If h is exactly h1, or h is between h1 and h2 (considering wrap)
                    if (val <= diff || (diff === 0 && val === 0)) {
                        // Found it. 
                        // t = val / diff
                        // If diff is 0 (e.g., Red-Orange and Orange both have hue 30),
                        // then h must be equal to h1 (approx). We map to the center of the segment.
                        const t = diff === 0 ? 0.5 : val / diff

                        // The angle for segment i starts at i*30 (relative to top)
                        // The interpolation happens across the 30-degree segment.
                        const segmentStartAngleRelTop = i * 30

                        return segmentStartAngleRelTop + t * 30
                    }
                }
                return 0 // Fallback (should not happen if hue is within 0-360 range)
            }

            const angleRelTop = findAngleForHue(hsl.h)

            // convert back to canvas radians
            // AngleRelTop 0 = -90 canvas degrees
            // angleCanvas = angleRelTop - 90
            const angleRad = (angleRelTop - 90) * (Math.PI / 180)

            // dist = sat % * radius
            const dist = (hsl.s / 100) * radius

            const markerX = cx + dist * Math.cos(angleRad)
            const markerY = cy + dist * Math.sin(angleRad)

            // Draw marker
            ctx.beginPath()
            ctx.arc(markerX, markerY, 5, 0, Math.PI * 2)
            ctx.fillStyle = `rgb(${sampledColor.rgb.r}, ${sampledColor.rgb.g}, ${sampledColor.rgb.b})`
            ctx.fill()
            ctx.strokeStyle = 'white'
            ctx.lineWidth = 2
            ctx.shadowColor = 'rgba(0,0,0,0.5)'
            ctx.shadowBlur = 4
            ctx.stroke()
            ctx.shadowBlur = 0
        }

    }, [sampledColor, highlightedIndex])

    return (
        <div ref={containerRef} className="flex flex-col items-center w-full">
            <div className="relative aspect-square w-full max-w-[300px] shadow-2xl rounded-full overflow-hidden border-4 border-gray-800">
                <canvas
                    ref={canvasRef}
                    width={wheelSize}
                    height={wheelSize}
                    onClick={handleClick}
                    className="w-full h-full cursor-pointer"
                />
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-6 text-xs text-gray-500 justify-center">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white border border-gray-600"></span>
                    Selected
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-white/20 border border-white"></span>
                    Segment
                </span>
            </div>

            <p className="mt-4 text-xs text-center text-gray-500 max-w-[250px]">
                Outer edge = Pure Color (High Saturation)<br />
                Center = Gray (Low Saturation)
            </p>
        </div>
    )
}
