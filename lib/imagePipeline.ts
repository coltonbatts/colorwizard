/**
 * imagePipeline.ts - Core utility for mobile-safe image operations.
 * Handles decoding, orientation normalization, and capped-resolution source buffers.
 */

export interface ImageDimensions {
    width: number;
    height: number;
}

/**
 * Normalizes an image by drawing it into a capped-resolution canvas.
 * This prevents iOS Safari from hitting memory limits for large images
 * and provides a stable buffer for both display and color sampling.
 */
export async function createSourceBuffer(
    image: HTMLImageElement,
    maxDim: number = 2048
): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    let { width, height } = image;

    // Calculate target dimensions
    if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', {
        alpha: false,
        willReadFrequently: true // Optimized for getImageData sampling
    });

    if (!ctx) {
        throw new Error('Failed to create source buffer context');
    }

    try {
        // Optimization: Use createImageBitmap if available (modern browsers)
        // This handles downscaling much more efficiently than drawImage on a massive source
        if ('createImageBitmap' in window) {
            const bitmap = await createImageBitmap(image, {
                resizeWidth: width,
                resizeHeight: height,
                resizeQuality: 'high'
            });
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close(); // Important: release memory immediately
        } else {
            // Fallback for older browsers
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, 0, 0, width, height);
        }
    } catch (err) {
        console.warn('[imagePipeline] createImageBitmap failed, falling back to drawImage', err);
        // Fallback if bitmap creation fails
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, width, height);
    }

    console.log(`[imagePipeline] Created source buffer: ${width}x${height} (original ${image.width}x${image.height})`);

    return canvas;
}

/**
 * Robustly decodes a Data URL or URL into an HTMLImageElement.
 */
export function decodeImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to decode image'));
        img.src = src;
    });
}

/**
 * Checks if the current browser is likely to hit canvas memory limits (iOS Safari).
 */
export function isMemoryConstrained(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
