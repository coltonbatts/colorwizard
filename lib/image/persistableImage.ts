/**
 * persistableImage.ts - keeps the persisted reference image inside a storage budget.
 *
 * `useCanvasStore` persists `referenceImage` as a string so the workbench can restore a
 * session after a reload. Encoding a phone photo as a full-resolution PNG data URL costs
 * several megabytes of characters, which overruns the ~5MB localStorage quota. The write
 * then fails, and because the canvas bucket also carries canvas and value-scale settings,
 * every one of them is lost with it.
 *
 * Encoding is a ladder rather than a single format because neither format always wins:
 * PNG is smaller for flat artwork, JPEG is smaller for photographs. We take the first
 * candidate that fits the budget.
 */

/** Matches MAX_SOURCE_DIM in imagePipeline: the resolution the app already samples at. */
export const PERSIST_MAX_DIM = 2048;

/**
 * Character budget for a persisted reference image. Browsers allow roughly 5M characters
 * per origin; staying near 2M leaves room for settings, the session bucket, and the
 * tighter accounting used by mobile Safari.
 */
export const PERSIST_BUDGET_CHARS = 2_000_000;

/**
 * Above this pixel count a lossless attempt is not worth its encode cost - photographs at
 * that size never fit the budget as PNG.
 */
const LOSSLESS_PIXEL_LIMIT = 1_200_000;

export interface EncodeAttempt {
    maxDim: number;
    mimeType: 'image/png' | 'image/jpeg';
    /** Undefined for PNG, which ignores the quality argument. */
    quality?: number;
}

export interface PersistableImage {
    dataUrl: string;
    attempt: EncodeAttempt;
    chars: number;
    /** False when the ladder fell back to a lossy or downscaled candidate. */
    lossless: boolean;
}

/**
 * Ordered encoding candidates, cheapest-fidelity-loss first. Small or flat sources get a
 * lossless attempt; large ones start at JPEG and step down quality, then resolution.
 */
export function planPersistAttempts(width: number, height: number): EncodeAttempt[] {
    if (width <= 0 || height <= 0) return [];

    const attempts: EncodeAttempt[] = [];
    const scaledPixels = estimateScaledPixels(width, height, PERSIST_MAX_DIM);

    if (scaledPixels <= LOSSLESS_PIXEL_LIMIT) {
        attempts.push({ maxDim: PERSIST_MAX_DIM, mimeType: 'image/png' });
    }

    attempts.push(
        { maxDim: PERSIST_MAX_DIM, mimeType: 'image/jpeg', quality: 0.9 },
        { maxDim: PERSIST_MAX_DIM, mimeType: 'image/jpeg', quality: 0.8 },
        { maxDim: 1600, mimeType: 'image/jpeg', quality: 0.8 },
        { maxDim: 1280, mimeType: 'image/jpeg', quality: 0.75 },
        { maxDim: 1024, mimeType: 'image/jpeg', quality: 0.7 },
    );

    return attempts;
}

/** Pixel count after fitting within maxDim, preserving aspect ratio. */
export function estimateScaledPixels(width: number, height: number, maxDim: number): number {
    if (width <= 0 || height <= 0) return 0;
    if (width <= maxDim && height <= maxDim) return width * height;
    const ratio = Math.min(maxDim / width, maxDim / height);
    return Math.round(width * ratio) * Math.round(height * ratio);
}

export function fitsPersistBudget(value: string, budget: number = PERSIST_BUDGET_CHARS): boolean {
    return value.length <= budget;
}

/**
 * True when `src` is something we can hand back to an <img> after a reload.
 * Blob and object URLs die with the page; desktop file paths are resolved elsewhere.
 */
export function isRestorableSrc(src: string | null | undefined): boolean {
    if (!src) return false;
    if (src.startsWith('blob:')) return false;
    return true;
}

/** True when `src` is an inline data URL large enough to threaten the storage budget. */
export function exceedsPersistBudget(
    src: string | null | undefined,
    budget: number = PERSIST_BUDGET_CHARS,
): boolean {
    if (!src) return false;
    return src.length > budget;
}

export type CanvasEncoder = (
    image: CanvasImageSource,
    width: number,
    height: number,
    attempt: EncodeAttempt,
) => string | null;

function scaledSize(width: number, height: number, maxDim: number) {
    if (width <= maxDim && height <= maxDim) return { width, height };
    const ratio = Math.min(maxDim / width, maxDim / height);
    return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

const domEncoder: CanvasEncoder = (image, width, height, attempt) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: attempt.mimeType === 'image/png' });
    if (!ctx) return null;

    // JPEG has no alpha; without a matte, transparent source pixels encode as black.
    if (attempt.mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);

    try {
        return attempt.quality === undefined
            ? canvas.toDataURL(attempt.mimeType)
            : canvas.toDataURL(attempt.mimeType, attempt.quality);
    } catch (err) {
        // Tainted canvas (cross-origin source) or an out-of-memory encode.
        console.warn('[persistableImage] encode failed', err);
        return null;
    }
};

/**
 * Encode `image` as the highest-fidelity data URL that fits the budget.
 * Returns null when even the smallest candidate is too large or encoding is unavailable.
 */
export function encodePersistableImage(
    image: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    options: { budget?: number; encoder?: CanvasEncoder } = {},
): PersistableImage | null {
    const budget = options.budget ?? PERSIST_BUDGET_CHARS;
    const encode = options.encoder ?? domEncoder;
    const attempts = planPersistAttempts(sourceWidth, sourceHeight);

    let smallest: PersistableImage | null = null;

    for (const attempt of attempts) {
        const { width, height } = scaledSize(sourceWidth, sourceHeight, attempt.maxDim);
        const dataUrl = encode(image, width, height, attempt);
        if (!dataUrl) continue;

        const candidate: PersistableImage = {
            dataUrl,
            attempt,
            chars: dataUrl.length,
            lossless: attempt.mimeType === 'image/png' && attempt.maxDim >= PERSIST_MAX_DIM,
        };

        if (fitsPersistBudget(dataUrl, budget)) return candidate;
        if (!smallest || candidate.chars < smallest.chars) smallest = candidate;
    }

    // Every candidate overran the budget - refuse rather than poison the storage bucket.
    return null;
}
