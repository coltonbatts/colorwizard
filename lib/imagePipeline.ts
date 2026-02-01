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

    // Preserve aspect ratio while capping resolution
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

    // iOS Safari sometimes fails to draw huge images in one go if they are > 4096px
    // But since we are already capping the target, the downscale happens during drawImage.
    // If the *source* image is massive, it might still be risky, but this is the standard way.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);

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
