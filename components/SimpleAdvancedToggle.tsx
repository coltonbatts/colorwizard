'use client'

import { useStore } from '@/lib/store/useStore'

interface SimpleAdvancedToggleProps {
    className?: string
}

/**
 * Pill toggle for Simple/Advanced mode.
 * Simple mode hides power-user features for a cleaner experience.
 * Keyboard shortcut: Shift+S
 */
export default function SimpleAdvancedToggle({ className = '' }: SimpleAdvancedToggleProps) {
    const { simpleMode, toggleSimpleMode } = useStore()

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <button
                onClick={toggleSimpleMode}
                className="relative flex items-center h-8 rounded-full bg-gray-100 border border-gray-200 p-0.5 transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                role="switch"
                aria-checked={!simpleMode}
                aria-label={`Switch to ${simpleMode ? 'Advanced' : 'Simple'} mode`}
                title="Toggle Simple/Advanced mode (Shift+S)"
            >
                <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all ${simpleMode
                        ? 'bg-white text-studio shadow-sm'
                        : 'text-gray-400'
                        }`}
                >
                    Simple
                </span>
                <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all ${!simpleMode
                        ? 'bg-white text-studio shadow-sm'
                        : 'text-gray-400'
                        }`}
                >
                    Pro
                </span>
            </button>
        </div>
    )
}
