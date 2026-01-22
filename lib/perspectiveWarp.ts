/**
 * Perspective warp utilities for transforming images using CSS matrix3d.
 * Used by Check My Drawing feature to overlay WIP photos on reference images
 * with adjustable perspective correction via corner handles.
 */

export interface Point2D {
    x: number
    y: number
}

export interface CornerPoints {
    topLeft: Point2D
    topRight: Point2D
    bottomLeft: Point2D
    bottomRight: Point2D
}

/**
 * Get default corner positions for an image (no transformation).
 * @param width Image width in pixels
 * @param height Image height in pixels
 * @returns CornerPoints at natural image corners
 */
export function getDefaultCorners(width: number, height: number): CornerPoints {
    return {
        topLeft: { x: 0, y: 0 },
        topRight: { x: width, y: 0 },
        bottomLeft: { x: 0, y: height },
        bottomRight: { x: width, y: height }
    }
}

/**
 * Constrain a corner point within viewport bounds.
 * @param point The corner position to constrain
 * @param bounds Maximum x and y values
 * @returns Constrained point
 */
export function constrainCorner(
    point: Point2D,
    bounds: { maxX: number; maxY: number; minX?: number; minY?: number }
): Point2D {
    const minX = bounds.minX ?? 0
    const minY = bounds.minY ?? 0
    return {
        x: Math.max(minX, Math.min(bounds.maxX, point.x)),
        y: Math.max(minY, Math.min(bounds.maxY, point.y))
    }
}

/**
 * Solve a system of linear equations using Gaussian elimination.
 * Used internally for computing perspective transformation matrix.
 */
function solve(A: number[][], b: number[]): number[] {
    const n = b.length
    const augmented = A.map((row, i) => [...row, b[i]])

    // Forward elimination
    for (let col = 0; col < n; col++) {
        // Find pivot
        let maxRow = col
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
                maxRow = row
            }
        }
        [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]]

        // Eliminate column
        for (let row = col + 1; row < n; row++) {
            const factor = augmented[row][col] / augmented[col][col]
            for (let j = col; j <= n; j++) {
                augmented[row][j] -= factor * augmented[col][j]
            }
        }
    }

    // Back substitution
    const x = new Array(n).fill(0)
    for (let row = n - 1; row >= 0; row--) {
        x[row] = augmented[row][n]
        for (let col = row + 1; col < n; col++) {
            x[row] -= augmented[row][col] * x[col]
        }
        x[row] /= augmented[row][row]
    }

    return x
}

/**
 * Compute a CSS matrix3d string for perspective transformation.
 * Maps a rectangle to an arbitrary quadrilateral defined by four corners.
 * 
 * @param corners Target corner positions (where the image corners should map to)
 * @param width Original image width
 * @param height Original image height
 * @returns CSS matrix3d() function string
 */
export function computeMatrix3d(
    corners: CornerPoints,
    width: number,
    height: number
): string {
    // Source corners (original rectangle)
    const src = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height }
    ]

    // Destination corners (transformed quadrilateral)
    const dst = [
        corners.topLeft,
        corners.topRight,
        corners.bottomRight,
        corners.bottomLeft
    ]

    // Build the 8x8 matrix for perspective transformation
    // We solve for 8 unknowns: a, b, c, d, e, f, g, h
    // The transformation is:
    // x' = (ax + by + c) / (gx + hy + 1)
    // y' = (dx + ey + f) / (gx + hy + 1)

    const A: number[][] = []
    const b: number[] = []

    for (let i = 0; i < 4; i++) {
        const sx = src[i].x
        const sy = src[i].y
        const dx = dst[i].x
        const dy = dst[i].y

        A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx])
        b.push(dx)
        A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy])
        b.push(dy)
    }

    const coeffs = solve(A, b)
    const [a, bCoeff, c, d, e, f, g, h] = coeffs

    // Convert to CSS matrix3d format
    // CSS matrix3d uses column-major order:
    // matrix3d(a1, b1, c1, d1, a2, b2, c2, d2, a3, b3, c3, d3, a4, b4, c4, d4)
    // For 2D perspective:
    // | a  d  0  g |
    // | b  e  0  h |
    // | 0  0  1  0 |
    // | c  f  0  1 |

    return `matrix3d(${a}, ${d}, 0, ${g}, ${bCoeff}, ${e}, 0, ${h}, 0, 0, 1, 0, ${c}, ${f}, 0, 1)`
}

/**
 * Check if corners form a valid convex quadrilateral.
 * Invalid configurations could cause visual issues.
 * @param corners The corner points to validate
 * @returns true if corners form a valid convex quad
 */
export function isValidQuadrilateral(corners: CornerPoints): boolean {
    const points = [
        corners.topLeft,
        corners.topRight,
        corners.bottomRight,
        corners.bottomLeft
    ]

    // Check cross product signs for convexity
    const crossProducts: number[] = []
    for (let i = 0; i < 4; i++) {
        const p1 = points[i]
        const p2 = points[(i + 1) % 4]
        const p3 = points[(i + 2) % 4]

        const v1 = { x: p2.x - p1.x, y: p2.y - p1.y }
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }

        crossProducts.push(v1.x * v2.y - v1.y * v2.x)
    }

    // All cross products should have the same sign for convexity
    const allPositive = crossProducts.every(cp => cp > 0)
    const allNegative = crossProducts.every(cp => cp < 0)

    return allPositive || allNegative
}

/**
 * Interpolate between two corner configurations.
 * Useful for smooth reset animations.
 * @param from Starting corners
 * @param to Ending corners  
 * @param t Interpolation factor (0 = from, 1 = to)
 * @returns Interpolated corner positions
 */
export function interpolateCorners(
    from: CornerPoints,
    to: CornerPoints,
    t: number
): CornerPoints {
    const lerp = (a: number, b: number) => a + (b - a) * t

    return {
        topLeft: { x: lerp(from.topLeft.x, to.topLeft.x), y: lerp(from.topLeft.y, to.topLeft.y) },
        topRight: { x: lerp(from.topRight.x, to.topRight.x), y: lerp(from.topRight.y, to.topRight.y) },
        bottomLeft: { x: lerp(from.bottomLeft.x, to.bottomLeft.x), y: lerp(from.bottomLeft.y, to.bottomLeft.y) },
        bottomRight: { x: lerp(from.bottomRight.x, to.bottomRight.x), y: lerp(from.bottomRight.y, to.bottomRight.y) }
    }
}

/**
 * Compose a CSS transform string from position, scale, and rotation.
 */
export function composeTransform(
    position: { x: number; y: number },
    scale: number,
    rotation: number
): string {
    let transform = `translate(${position.x}px, ${position.y}px)`
    if (scale !== 1) transform += ` scale(${scale})`
    if (rotation !== 0) transform += ` rotate(${rotation}deg)`
    return transform
}

/**
 * Apply a transformation to base corners.
 */
export function applyPerspectiveToCorners(
    baseCorners: CornerPoints,
    matrix: string // matrix3d(...)
): CornerPoints {
    // This is complex to implement fully in JS without a matrix library,
    // but for now we can rely on our computeMatrix3d working in the other direction.
    // If needed, we could add point transformation logic here.
    return baseCorners
}
