'use client'

/**
 * Spinner - Simple spinning loader with size variants
 */

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    label?: string
    className?: string
}

const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
}

export default function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
    return (
        <div className={`flex flex-col items-center justify-center gap-2 ${className}`} role="status">
            <div
                className={`${sizeClasses[size]} animate-spin rounded-full border-gray-300 border-t-blue-500`}
                aria-hidden="true"
            />
            {label && <span className="text-sm text-gray-500">{label}</span>}
            <span className="sr-only">{label || 'Loading...'}</span>
        </div>
    )
}
