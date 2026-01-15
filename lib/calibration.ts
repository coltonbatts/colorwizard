/**
 * Screen Calibration Utilities
 * 
 * Manages calibration data for converting CSS pixels to real-world inches.
 * Stores data in localStorage with zoom fingerprinting for stale detection.
 */

export interface CalibrationData {
    /** Pixels per inch for the current display/zoom level */
    pxPerInch: number
    /** Method used for calibration */
    method: 'credit_card' | 'ruler'
    /** Reference size used in inches */
    referenceInches: number
    /** ISO timestamp when calibration was created */
    createdAtISO: string
    /** Device pixel ratio at time of calibration */
    devicePixelRatio: number
    /** Viewport scale at time of calibration (for pinch-zoom detection) */
    viewportScale: number | null
    /** Physical canvas width in inches (optional) */
    canvasWidthInches?: number
    /** Physical canvas height in inches (optional) */
    canvasHeightInches?: number
    /** Whether calibration is locked from changes */
    isLocked?: boolean
    /** ISO timestamp when calibration was locked */
    lockedAtISO?: string
}

export interface ZoomFingerprint {
    dpr: number
    viewportScale: number | null
}

const STORAGE_KEY = 'colorwizard:calibration:v1'

/** Standard credit card width in inches (ISO/IEC 7810 ID-1) */
export const CREDIT_CARD_WIDTH_INCHES = 3.370

/** Default reference options for ruler method */
export const RULER_REFERENCES = [
    { label: '2 inches', inches: 2 },
    { label: '5 cm', inches: 5 / 2.54 }, // ~1.9685 inches
] as const

/**
 * Get the current zoom fingerprint from the browser
 */
export function getZoomFingerprint(): ZoomFingerprint {
    return {
        dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        viewportScale: typeof window !== 'undefined' && window.visualViewport
            ? window.visualViewport.scale
            : null
    }
}

/**
 * Load calibration data from localStorage
 */
export function loadCalibration(): CalibrationData | null {
    if (typeof window === 'undefined') return null

    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return null

        const data = JSON.parse(stored) as CalibrationData

        // Validate required fields
        if (typeof data.pxPerInch !== 'number' || data.pxPerInch <= 0) {
            return null
        }

        return data
    } catch (e) {
        console.error('Failed to load calibration data:', e)
        return null
    }
}

/**
 * Save calibration data to localStorage
 */
export function saveCalibration(data: CalibrationData): void {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
        console.error('Failed to save calibration data:', e)
    }
}

/**
 * Clear calibration data from localStorage
 */
export function clearCalibration(): void {
    if (typeof window === 'undefined') return

    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
        console.error('Failed to clear calibration data:', e)
    }
}

/**
 * Check if saved calibration might be stale due to zoom/display changes
 */
export function isCalibrationStale(data: CalibrationData): boolean {
    const current = getZoomFingerprint()

    // Check device pixel ratio (browser zoom changes this)
    if (Math.abs(data.devicePixelRatio - current.dpr) > 0.01) {
        return true
    }

    // Check viewport scale (pinch zoom on mobile/trackpad)
    if (data.viewportScale !== null && current.viewportScale !== null) {
        if (Math.abs(data.viewportScale - current.viewportScale) > 0.01) {
            return true
        }
    }

    return false
}

/**
 * Create a new calibration data object
 */
export function createCalibration(
    pxPerInch: number,
    method: CalibrationData['method'],
    referenceInches: number
): CalibrationData {
    const fingerprint = getZoomFingerprint()

    return {
        pxPerInch,
        method,
        referenceInches,
        createdAtISO: new Date().toISOString(),
        devicePixelRatio: fingerprint.dpr,
        viewportScale: fingerprint.viewportScale
    }
}

/**
 * Convert CSS pixels to inches using calibration
 */
export function pxToInches(px: number, calibration: CalibrationData): number {
    return px / calibration.pxPerInch
}

/**
 * Convert inches to CSS pixels using calibration
 */
export function inchesToPx(inches: number, calibration: CalibrationData): number {
    return inches * calibration.pxPerInch
}

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
    return inches * 2.54
}

/** Transform state for coordinate conversions */
export interface TransformState {
    zoomLevel: number
    panOffset: { x: number; y: number }
    /** Offset and dimensions of the image relative to the canvas (pre-transform) */
    imageDrawInfo?: {
        x: number
        y: number
        width: number
        height: number
    }
}

/**
 * Convert screen-space coordinates to canvas-space coordinates.
 * Formula: canvasCoord = (screenCoord - panOffset) / zoomLevel
 */
export function screenToCanvas(
    screenX: number,
    screenY: number,
    transform: TransformState
): { x: number; y: number } {
    return {
        x: (screenX - transform.panOffset.x) / transform.zoomLevel,
        y: (screenY - transform.panOffset.y) / transform.zoomLevel
    }
}

/**
 * Convert canvas-space coordinates to screen-space coordinates.
 * Formula: screenCoord = (canvasCoord × zoomLevel) + panOffset
 */
export function canvasToScreen(
    canvasX: number,
    canvasY: number,
    transform: TransformState
): { x: number; y: number } {
    return {
        x: (canvasX * transform.zoomLevel) + transform.panOffset.x,
        y: (canvasY * transform.zoomLevel) + transform.panOffset.y
    }
}

/**
 * Convert screen-space coordinates to image-relative coordinates (pixels).
 * This is invariant to zoom, pan, and canvas resizing.
 */
export function screenToImage(
    screenX: number,
    screenY: number,
    transform: TransformState,
    imageOriginalWidth: number,
    imageOriginalHeight: number
): { x: number; y: number } | null {
    if (!transform.imageDrawInfo) return null

    // 1. Get canvas-space coordinate
    const canvasPoint = screenToCanvas(screenX, screenY, transform)

    // 2. Adjust for image offset relative to canvas
    const xInFittedImage = canvasPoint.x - transform.imageDrawInfo.x
    const yInFittedImage = canvasPoint.y - transform.imageDrawInfo.y

    // 3. Scale to original image dimensions
    // The fitted image dimensions (width/height) are the "fit-to-canvas" base dimensions
    const scaleX = imageOriginalWidth / transform.imageDrawInfo.width
    const scaleY = imageOriginalHeight / transform.imageDrawInfo.height

    return {
        x: xInFittedImage * scaleX,
        y: yInFittedImage * scaleY
    }
}

/**
 * Convert image-relative coordinates (pixels) to screen-space coordinates.
 */
export function imageToScreen(
    imageX: number,
    imageY: number,
    transform: TransformState,
    imageOriginalWidth: number,
    imageOriginalHeight: number
): { x: number; y: number } | null {
    if (!transform.imageDrawInfo) return null

    // 1. Scale from original image dimensions to fitted dimensions
    const scaleX = transform.imageDrawInfo.width / imageOriginalWidth
    const scaleY = transform.imageDrawInfo.height / imageOriginalHeight

    const xInFittedImage = imageX * scaleX
    const yInFittedImage = imageY * scaleY

    // 2. Adjust for image offset relative to canvas
    const canvasX = xInFittedImage + transform.imageDrawInfo.x
    const canvasY = yInFittedImage + transform.imageDrawInfo.y

    // 3. Apply zoom and pan
    return canvasToScreen(canvasX, canvasY, transform)
}

/**
 * Convert image pixels to real-world units based on canvas dimensions
 */
export function imageToCanvasUnits(
    pixels: number,
    imageTotalPixels: number,
    canvasTotalUnits: number
): number {
    return (pixels / imageTotalPixels) * canvasTotalUnits
}

/**
 * Convert canvas units to image pixels
 */
export function canvasUnitsToImagePixels(
    units: number,
    canvasTotalUnits: number,
    imageTotalPixels: number
): number {
    return (units / canvasTotalUnits) * imageTotalPixels
}

/**
 * Lock calibration to prevent accidental changes
 */
export function lockCalibration(data: CalibrationData): CalibrationData {
    return {
        ...data,
        isLocked: true,
        lockedAtISO: new Date().toISOString()
    }
}

/**
 * Unlock calibration to allow changes
 */
export function unlockCalibration(data: CalibrationData): CalibrationData {
    return {
        ...data,
        isLocked: false,
        lockedAtISO: undefined
    }
}
