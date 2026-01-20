'use client'

/**
 * SkeletonLoader - Animated pulse skeleton building blocks
 * Use to create loading placeholders that match actual content shape
 */

interface SkeletonProps {
    className?: string
}

/**
 * Base skeleton block - use className to set height/width
 */
export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`bg-gray-200 dark:bg-gray-700 animate-pulse rounded ${className}`}
            aria-hidden="true"
        />
    )
}

interface SkeletonTextProps {
    lines?: number
    className?: string
}

/**
 * Multiple skeleton lines for text content
 */
export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
    return (
        <div className={`space-y-2 ${className}`} aria-hidden="true">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
                />
            ))}
        </div>
    )
}

/**
 * Skeleton for paint recipe ingredient row
 */
export function SkeletonRecipeRow() {
    return (
        <div className="flex items-center gap-2 p-2 bg-gray-800/30 rounded border border-gray-800">
            {/* Color swatch */}
            <Skeleton className="w-4 h-4 rounded shrink-0 bg-gray-600" />
            {/* Name */}
            <Skeleton className="h-3 flex-1 bg-gray-600" />
            {/* Percentage bar */}
            <Skeleton className="w-12 h-1.5 rounded-full bg-gray-600 hidden sm:block" />
            {/* Percentage text */}
            <Skeleton className="w-8 h-3 bg-gray-600" />
        </div>
    )
}

/**
 * Full skeleton for paint recipe section
 */
export function SkeletonPaintRecipe() {
    return (
        <div className="space-y-4" role="status" aria-label="Loading recipe">
            {/* Swatch comparison */}
            <div className="flex gap-3">
                <div className="flex-1">
                    <Skeleton className="h-3 w-20 mb-1 bg-gray-600" />
                    <Skeleton className="h-16 rounded-lg bg-gray-600" />
                </div>
                <div className="w-16">
                    <Skeleton className="h-3 w-12 mb-1 bg-gray-600" />
                    <Skeleton className="h-16 rounded-lg bg-gray-600" />
                </div>
            </div>

            {/* Match quality */}
            <div className="flex items-center gap-2">
                <Skeleton className="w-2 h-2 rounded-full bg-gray-600" />
                <Skeleton className="h-3 w-24 bg-gray-600" />
            </div>

            {/* Steps header */}
            <Skeleton className="h-3 w-20 bg-gray-600" />

            {/* Steps */}
            <div className="space-y-2 ml-4">
                <Skeleton className="h-3 w-full bg-gray-600" />
                <Skeleton className="h-3 w-5/6 bg-gray-600" />
                <Skeleton className="h-3 w-4/5 bg-gray-600" />
            </div>

            {/* Ingredients header */}
            <Skeleton className="h-3 w-24 bg-gray-600" />

            {/* Ingredient rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                <SkeletonRecipeRow />
                <SkeletonRecipeRow />
                <SkeletonRecipeRow />
                <SkeletonRecipeRow />
            </div>

            <span className="sr-only">Loading paint recipe...</span>
        </div>
    )
}

/**
 * Skeleton for DMC floss match card
 */
export function SkeletonDMCMatch() {
    return (
        <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded border border-gray-700">
            {/* Confidence strip */}
            <Skeleton className="absolute left-0 top-0 bottom-0 w-1 bg-gray-600" />
            {/* Color swatch */}
            <Skeleton className="w-12 h-12 rounded border-2 border-gray-600 ml-2 bg-gray-600" />
            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-baseline gap-2">
                    <Skeleton className="h-4 w-12 bg-gray-600" />
                    <Skeleton className="h-3 w-24 bg-gray-600" />
                </div>
                <Skeleton className="h-3 w-16 bg-gray-600" />
            </div>
            {/* Percentage */}
            <div className="text-right space-y-1">
                <Skeleton className="h-5 w-10 bg-gray-600" />
                <Skeleton className="h-2 w-6 bg-gray-600" />
            </div>
        </div>
    )
}

/**
 * Skeleton for DMC floss matches section
 */
export function SkeletonDMCMatches({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3" role="status" aria-label="Loading matches">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonDMCMatch key={i} />
            ))}
            <span className="sr-only">Loading DMC matches...</span>
        </div>
    )
}
