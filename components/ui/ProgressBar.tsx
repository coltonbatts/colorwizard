'use client'

/**
 * ProgressBar - Determinate and indeterminate progress indicator
 */

interface ProgressBarProps {
    /** Progress value 0-100, omit for indeterminate */
    value?: number
    /** Optional label */
    label?: string
    /** Size variant */
    size?: 'sm' | 'md'
    className?: string
}

export default function ProgressBar({
    value,
    label,
    size = 'md',
    className = '',
}: ProgressBarProps) {
    const isIndeterminate = value === undefined
    const heightClass = size === 'sm' ? 'h-1' : 'h-2'

    return (
        <div className={`w-full ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
            {label && (
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>{label}</span>
                    {!isIndeterminate && <span>{Math.round(value)}%</span>}
                </div>
            )}
            <div className={`${heightClass} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
                {isIndeterminate ? (
                    <div
                        className={`${heightClass} bg-blue-500 rounded-full animate-indeterminate-progress`}
                        style={{ width: '30%' }}
                    />
                ) : (
                    <div
                        className={`${heightClass} bg-blue-500 rounded-full transition-all duration-300 ease-out`}
                        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                    />
                )}
            </div>
        </div>
    )
}
