'use client'

/**
 * ColorWheelTab - Dedicated color wheel visualization tab
 * Shows the PhotoshopColorWheel as a supportive reference tool
 */

import { rgb as culoriRgb } from 'culori'
import PhotoshopColorWheel from '../PhotoshopColorWheel'
import ColorHarmonies from '../ColorHarmonies'

interface ColorWheelTabProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
    } | null
    onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
}

export default function ColorWheelTab({ sampledColor, onColorSelect }: ColorWheelTabProps) {
    if (!sampledColor) {
        return (
            <div className="tab-empty-state">
                <div className="tab-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z" />
                    </svg>
                </div>
                <p className="tab-empty-title">Sample a color to see its position</p>
                <p className="tab-empty-subtitle">Tap anywhere on your image</p>
            </div>
        )
    }

    const { hex, rgb } = sampledColor

    const handleColorChange = (newHex: string) => {
        if (onColorSelect) {
            const parsed = culoriRgb(newHex)
            if (parsed) {
                onColorSelect({
                    r: Math.round(parsed.r * 255),
                    g: Math.round(parsed.g * 255),
                    b: Math.round(parsed.b * 255)
                })
            }
        }
    }

    return (
        <div className="tab-content-scroll">
            {/* Color Wheel */}
            <section className="mb-6">
                <PhotoshopColorWheel
                    color={hex}
                    onChange={handleColorChange}
                />
            </section>

            {/* Color Harmonies - De-emphasized */}
            <section className="color-wheel-harmonies">
                <h4 className="text-[10px] font-bold text-studio-dim uppercase tracking-widest mb-3">
                    Color Harmonies
                </h4>
                <ColorHarmonies
                    rgb={rgb}
                    onColorSelect={onColorSelect || (() => { })}
                />
            </section>
        </div>
    )
}
