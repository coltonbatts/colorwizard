'use client'

/**
 * OpacitySlider - Reusable opacity control component.
 * Shows current percentage and provides smooth real-time updates.
 */

interface OpacitySliderProps {
    /** Opacity value from 0 to 100 */
    value: number
    /** Callback when value changes */
    onChange: (value: number) => void
    /** Optional label text */
    label?: string
    /** Optional additional className */
    className?: string
}

export default function OpacitySlider({
    value,
    onChange,
    label = 'Opacity',
    className = ''
}: OpacitySliderProps) {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                {label}
            </span>
            <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs text-gray-300 font-mono w-10 text-right">
                {value}%
            </span>
        </div>
    )
}
