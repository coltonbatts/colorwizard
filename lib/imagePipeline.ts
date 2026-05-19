/**
 * imagePipeline.ts - Core utility for mobile-safe image operations.
 * Handles decoding, EXIF orientation normalization, and capped-resolution source buffers.
 */

export const MAX_SOURCE_DIM = 2048;

export interface ImageDimensions {
    width: number;
    height: number;
}

export interface ScaledDimensions extends ImageDimensions {}

/**
 * Scale dimensions to fit within maxDim while preserving aspect ratio.
 */
export function computeScaledDimensions(
    width: number,
    height: number,
    maxDim: number = MAX_SOURCE_DIM
): ScaledDimensions {
    if (width <= 0 || height <= 0) {
        return { width: 0, height: 0 };
    }
    if (width <= maxDim && height <= maxDim) {
        return { width, height };
    }
    const ratio = Math.min(maxDim / width, maxDim / height);
    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
    };
}

type CreateImageBitmapOptions = {
    resizeWidth?: number;
    resizeHeight?: number;
    resizeQuality?: 'pixelated' | 'low' | 'medium' | 'high';
    imageOrientation?: 'none' | 'flipY' | 'from-image';
};

/**
 * Decode a file/blob with EXIF orientation applied to pixel data.
 */
export async function decodeImageFile(file: Blob): Promise<HTMLImageElement> {
    if (typeof window === 'undefined') {
        throw new Error('decodeImageFile requires a browser environment');
    }

    if ('createImageBitmap' in window) {
        try {
            const bitmap = await createImageBitmap(file, {
                imageOrientation: 'from-image',
            } as CreateImageBitmapOptions);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                bitmap.close();
                throw new Error('Failed to create decode canvas context');
            }
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();
            return canvasToImage(canvas);
        } catch (err) {
            console.warn('[imagePipeline] createImageBitmap decode failed, falling back to object URL', err);
        }
    }

    const objectUrl = URL.createObjectURL(file);
    try {
        return await decodeImage(objectUrl);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

/**
 * Normalizes an image by drawing it into a capped-resolution canvas.
 * Applies EXIF orientation when supported so sampling matches what users see.
 */
export async function createSourceBuffer(
    image: HTMLImageElement | ImageBitmap,
    maxDim: number = MAX_SOURCE_DIM
): Promise<HTMLCanvasElement> {
    const sourceWidth = image.width;
    const sourceHeight = image.height;
    const { width, height } = computeScaledDimensions(sourceWidth, sourceHeight, maxDim);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', {
        alpha: false,
        willReadFrequently: true,
    });

    if (!ctx) {
        throw new Error('Failed to create source buffer context');
    }

    try {
        if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
            const bitmap = await createImageBitmap(image, {
                resizeWidth: width,
                resizeHeight: height,
                resizeQuality: 'high',
                imageOrientation: 'from-image',
            } as CreateImageBitmapOptions);
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();
        } else {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, 0, 0, width, height);
        }
    } catch (err) {
        console.warn('[imagePipeline] createImageBitmap failed, falling back to drawImage', err);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, width, height);
    }

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

function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
    return decodeImage(canvas.toDataURL('image/png'));
}

/**
 * Checks if the current browser is likely to hit canvas memory limits (iOS Safari).
 */
export function isMemoryConstrained(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
