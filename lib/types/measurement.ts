/**
 * Measurement Types for Dual-Layer Measurement System
 * 
 * Supports measuring elements in reference photos and paintings,
 * then comparing them for accurate transfers.
 */

/** Which layer the measurement belongs to */
export type MeasurementLayer = 'reference' | 'painting'

/** Match status for comparing reference vs painting measurements */
export type MatchStatus = 'exact' | 'close' | 'needs_adjustment'

/** A point in canvas-space coordinates (not screen-space) */
export interface Point {
    x: number
    y: number
}

/** A named measurement between two points */
export interface Measurement {
    id: string
    name: string
    layer: MeasurementLayer
    /** Start point in canvas-space coordinates */
    pointA: Point
    /** End point in canvas-space coordinates */
    pointB: Point
    /** Calculated physical distance in inches */
    valueInches: number
    /** ISO timestamp when created */
    createdAt: string
}

/** Comparison between a reference and painting measurement */
export interface MeasurementComparison {
    referenceMeasurement: Measurement
    paintingMeasurement: Measurement
    /** Absolute difference in inches */
    difference: number
    /** Percentage difference from reference */
    percentageDiff: number
    /** Match status based on tolerance thresholds */
    status: MatchStatus
}

/** Tolerance thresholds for match status (in inches) */
export const MATCH_TOLERANCES = {
    /** Difference < 0.01" = exact match */
    EXACT: 0.01,
    /** Difference < 0.05" = close match */
    CLOSE: 0.05
} as const

/**
 * Determine match status based on difference between measurements
 */
export function getMatchStatus(differenceInches: number): MatchStatus {
    const absDiff = Math.abs(differenceInches)
    if (absDiff < MATCH_TOLERANCES.EXACT) return 'exact'
    if (absDiff < MATCH_TOLERANCES.CLOSE) return 'close'
    return 'needs_adjustment'
}

/**
 * Generate a unique measurement ID
 */
export function generateMeasurementId(): string {
    return `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate distance between two points in canvas-space
 */
export function calculateDistance(pointA: Point, pointB: Point): number {
    return Math.sqrt(
        Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2)
    )
}

/**
 * Compare measurements by name and calculate differences
 */
export function compareMeasurements(
    referenceMeasurements: Measurement[],
    paintingMeasurements: Measurement[]
): MeasurementComparison[] {
    const comparisons: MeasurementComparison[] = []

    for (const ref of referenceMeasurements) {
        const painting = paintingMeasurements.find(
            p => p.name.toLowerCase().trim() === ref.name.toLowerCase().trim()
        )

        if (painting) {
            const difference = painting.valueInches - ref.valueInches
            const percentageDiff = ref.valueInches > 0
                ? (difference / ref.valueInches) * 100
                : 0

            comparisons.push({
                referenceMeasurement: ref,
                paintingMeasurement: painting,
                difference,
                percentageDiff,
                status: getMatchStatus(difference)
            })
        }
    }

    return comparisons
}

/**
 * Calculate overall accuracy percentage from comparisons
 */
export function calculateOverallAccuracy(comparisons: MeasurementComparison[]): number {
    if (comparisons.length === 0) return 0

    const exactMatches = comparisons.filter(c => c.status === 'exact').length
    const closeMatches = comparisons.filter(c => c.status === 'close').length

    // Exact matches count fully, close matches count as 50%
    const score = exactMatches + (closeMatches * 0.5)
    return (score / comparisons.length) * 100
}
