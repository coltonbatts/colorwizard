'use client';

import { useCallback, useState, useId } from 'react';

/**
 * ImageDropzone - Drag and drop zone for loading images.
 * Extracted from ImageCanvas.tsx for maintainability.
 */

interface ImageDropzoneProps {
    /** Called when an image is successfully loaded */
    onImageLoad: (img: HTMLImageElement) => void;
}

const limitedPalette = [
    { name: 'Titanium White', color: '#F4F1E8' },
    { name: 'Ivory Black', color: '#2D2926' },
    { name: 'Yellow Ochre', color: '#C79B44' },
    { name: 'Cadmium Red', color: '#B6402E' },
    { name: 'Phthalo Green', color: '#295B4F' },
    { name: 'Phthalo Blue', color: '#275A7A' },
];

const proofPoints = [
    'Real paint recipes',
    'DMC matches',
    'Nothing uploaded',
];

export default function ImageDropzone({ onImageLoad }: ImageDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const inputId = useId();
    const cameraInputId = useId();

    // Check if file is an image by extension or MIME type
    const isImageFile = useCallback((file: File): boolean => {
        // Check MIME type first
        if (file.type && file.type.startsWith('image/')) {
            return true;
        }

        // Check by file extension (handles HEIC, WebP, etc. that might have wrong MIME type)
        const extension = file.name.toLowerCase().split('.').pop();
        const imageExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
            'heic', 'heif', 'avif', 'tiff', 'tif', 'raw', 'cr2', 'nef', 'orf', 'sr2'
        ];

        return imageExtensions.includes(extension || '');
    }, []);

    const loadImage = useCallback(
        async (file: File) => {
            let processedFile = file;

            // Handle HEIC/HEIF conversion
            const isHeic = file.name.toLowerCase().endsWith('.heic') ||
                file.name.toLowerCase().endsWith('.heif') ||
                file.type === 'image/heic' ||
                file.type === 'image/heif';

            if (isHeic) {
                // Ensure we're in browser environment
                if (typeof window === 'undefined' || typeof Blob === 'undefined') {
                    console.error('[ImageDropzone] HEIC conversion requires browser environment');
                    alert('HEIC conversion is not available in this environment. Please convert your image to JPEG first.');
                    return;
                }

                // Validate file size (heic2any may struggle with very large files)
                const maxHeicSize = 50 * 1024 * 1024; // 50MB
                if (file.size > maxHeicSize) {
                    alert(`HEIC file is too large (${Math.round(file.size / 1024 / 1024)}MB). Please convert to JPEG first or use a smaller file.`);
                    return;
                }

                try {
                    setIsConverting(true);
                    console.log('[ImageDropzone] Starting HEIC conversion for:', file.name, file.size, 'bytes');

                    // Dynamic import with error handling
                    let heic2any;
                    try {
                        const heic2anyModule = await import('heic2any');
                        heic2any = heic2anyModule.default || heic2anyModule;

                        if (typeof heic2any !== 'function') {
                            throw new Error(`heic2any is not a function: ${typeof heic2any}`);
                        }
                    } catch (importErr) {
                        console.error('[ImageDropzone] Failed to import heic2any:', importErr);
                        const importErrorMsg = importErr instanceof Error
                            ? importErr.message
                            : String(importErr);
                        throw new Error(`Failed to load HEIC converter: ${importErrorMsg}`);
                    }

                    // Check WebAssembly support (heic2any requires it)
                    if (typeof WebAssembly === 'undefined') {
                        throw new Error('WebAssembly is not supported in this browser. HEIC conversion requires WebAssembly support.');
                    }

                    // Convert HEIC to JPEG with timeout
                    // Wrap in try-catch to catch any synchronous errors
                    let conversionPromise: Promise<Blob | Blob[]>;
                    try {
                        console.log('[ImageDropzone] Calling heic2any with file:', {
                            name: file.name,
                            size: file.size,
                            type: file.type
                        });

                        conversionPromise = heic2any({
                            blob: file,
                            toType: 'image/jpeg',
                            quality: 0.95
                        });

                        if (!(conversionPromise instanceof Promise)) {
                            throw new Error(`heic2any did not return a Promise, got: ${typeof conversionPromise}`);
                        }

                        console.log('[ImageDropzone] heic2any promise created successfully');
                    } catch (syncErr) {
                        console.error('[ImageDropzone] Synchronous error during heic2any call:', syncErr);
                        throw new Error(`Failed to start HEIC conversion: ${syncErr instanceof Error ? syncErr.message : String(syncErr)}`);
                    }

                    // Add timeout (30 seconds)
                    const timeoutPromise = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('HEIC conversion timed out after 30 seconds')), 30000)
                    );

                    // Wrap conversion promise to capture any errors
                    const wrappedConversionPromise = conversionPromise.catch((conversionErr) => {
                        console.error('[ImageDropzone] Conversion promise rejected:', conversionErr);
                        console.error('[ImageDropzone] Conversion error type:', typeof conversionErr);
                        console.error('[ImageDropzone] Conversion error constructor:', conversionErr?.constructor?.name);

                        // Deep inspection of the "empty" object
                        const allProps = conversionErr ? Object.getOwnPropertyNames(conversionErr) : [];
                        console.error('[ImageDropzone] Conversion error all properties:', allProps);

                        // Try to extract error message
                        let errorMsg = 'HEIC conversion failed';
                        if (conversionErr instanceof Error) {
                            errorMsg = conversionErr.message || 'Unknown conversion error';
                        } else if (typeof conversionErr === 'string') {
                            errorMsg = conversionErr;
                        } else if (conversionErr && typeof conversionErr === 'object') {
                            // Try to get message property or any descriptive property
                            const errObj = conversionErr as Record<string, unknown>;
                            errorMsg = (errObj.message as string) || (errObj.error as string) || (errObj.code as string) || errObj.toString?.() || 'Conversion error (details unavailable)';
                        }

                        throw new Error(`HEIC conversion failed: ${errorMsg}`);
                    });

                    let convertedBlob: Blob | Blob[];
                    try {
                        convertedBlob = await Promise.race([wrappedConversionPromise, timeoutPromise]);
                        console.log('[ImageDropzone] Conversion completed successfully');
                    } catch (raceErr) {
                        // Check if it's the timeout or the actual conversion error
                        if (raceErr instanceof Error && raceErr.message.includes('timed out')) {
                            throw raceErr;
                        }
                        // The error should already be wrapped with context from wrappedConversionPromise
                        console.error('[ImageDropzone] Error during Promise.race:', raceErr);
                        console.error('[ImageDropzone] Race error type:', typeof raceErr);
                        console.error('[ImageDropzone] Race error constructor:', raceErr?.constructor?.name);

                        // Re-throw with more context if not already wrapped
                        if (raceErr instanceof Error) {
                            throw raceErr;
                        } else {
                            throw new Error(`HEIC conversion failed: ${String(raceErr) || 'Unknown error during conversion'}`);
                        }
                    }

                    if (!convertedBlob) {
                        throw new Error('HEIC conversion returned no result');
                    }

                    // heic2any can return an array if multiple images are in the HEIC
                    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

                    if (!blob) {
                        throw new Error('HEIC conversion returned null or undefined');
                    }

                    if (!(blob instanceof Blob)) {
                        throw new Error(`Invalid conversion result: expected Blob, got ${typeof blob} (${Object.prototype.toString.call(blob)})`);
                    }

                    if (blob.size === 0) {
                        throw new Error('HEIC conversion returned empty blob');
                    }

                    processedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                        type: 'image/jpeg',
                    });
                    console.log('[ImageDropzone] HEIC converted to JPEG:', processedFile.size, 'bytes');
                } catch (err) {
                    // Extract error information with more aggressive error extraction
                    let errorMessage = 'Unknown error';
                    let errorDetails: Record<string, unknown> = {};

                    // Log the raw error first
                    console.error('[ImageDropzone] Raw error caught:', err);
                    console.error('[ImageDropzone] Error type:', typeof err);
                    console.error('[ImageDropzone] Error constructor:', (err as { constructor?: { name?: string } })?.constructor?.name);
                    console.error('[ImageDropzone] Error keys:', err ? Object.keys(err) : 'no keys');

                    if (err instanceof Error) {
                        errorMessage = err.message || 'Error without message';
                        errorDetails = {
                            message: err.message,
                            name: err.name,
                            stack: err.stack?.split('\n').slice(0, 10).join('\n') // More stack lines
                        };
                    } else if (typeof err === 'string') {
                        errorMessage = err;
                        errorDetails = { error: err };
                    } else if (err && typeof err === 'object') {
                        // Try to extract properties from the error object
                        try {
                            const errObj = err as Record<string, unknown>;
                            errorMessage = (errObj.message as string) || (errObj.error as string) || errObj.toString?.() || 'Object error';
                            errorDetails = {
                                ...errObj,
                                type: typeof err,
                                constructor: (err as { constructor?: { name?: string } }).constructor?.name,
                                stringified: JSON.stringify(err, Object.getOwnPropertyNames(err))
                            };
                        } catch {
                            // If we can't extract, try to stringify with replacer
                            try {
                                errorMessage = JSON.stringify(err, (key, value) => {
                                    if (value instanceof Error) {
                                        return { message: value.message, name: value.name, stack: value.stack };
                                    }
                                    return value;
                                });
                            } catch {
                                errorMessage = `Conversion failed - error type: ${typeof err}, constructor: ${(err as { constructor?: { name?: string } })?.constructor?.name || 'unknown'}`;
                            }
                            errorDetails = {
                                error: 'Non-serializable error object',
                                type: typeof err,
                                constructor: (err as { constructor?: { name?: string } })?.constructor?.name
                            };
                        }
                    } else {
                        errorMessage = String(err) || 'Unknown error type';
                        errorDetails = {
                            error: String(err),
                            type: typeof err
                        };
                    }

                    console.error('[ImageDropzone] HEIC conversion failed - errorDetails:', errorDetails);
                    console.error('[ImageDropzone] HEIC conversion failed - errorMessage:', errorMessage);
                    console.error('[ImageDropzone] Full error object (direct):', err);
                    console.error('[ImageDropzone] Full error object (JSON):', JSON.stringify(err, null, 2));

                    alert(`Failed to convert HEIC image.\n\nError: ${errorMessage}\n\nPlease try:\n1. Converting the image to JPEG using your device's Photos app\n2. Using a different image format\n3. Trying a smaller HEIC file (under 50MB)`);
                    setIsConverting(false);
                    return;
                } finally {
                    setIsConverting(false);
                }
            }

            const objectUrl = URL.createObjectURL(processedFile);
            const img = new Image();

            img.onerror = (e) => {
                console.error('[ImageDropzone] Failed to load image:', {
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    error: e
                });
                URL.revokeObjectURL(objectUrl);
                alert(`Failed to load image "${file.name}". Please try a different image format (JPEG, PNG, WebP, etc.).`);
            };

            img.onload = () => {
                console.log('[ImageDropzone] Image loaded successfully:', img.width, 'x', img.height);

                // If this is the initial blob URL load, convert to data URL for persistence
                if (img.src.startsWith('blob:')) {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        try {
                            const dataUrl = canvas.toDataURL('image/png');
                            console.log('[ImageDropzone] Converted image to data URL, trigger re-load');
                            // This will trigger img.onload again with the data URL
                            img.src = dataUrl;
                            URL.revokeObjectURL(objectUrl);
                            return; // Stop here, wait for the next onload
                        } catch (e) {
                            console.warn('[ImageDropzone] Failed to convert to data URL:', e);
                        }
                    }
                }

                // If we reach here, either data URL conversion failed/skipped 
                // OR this is the second onload (after data URL assignment)
                if (img.width > 0 && img.height > 0) {
                    onImageLoad(img);
                    if (img.src.startsWith('blob:')) {
                        URL.revokeObjectURL(objectUrl);
                    }
                } else {
                    console.warn('[ImageDropzone] Skipping onImageLoad for 0x0 image');
                }
            };

            img.src = objectUrl;
        },
        [onImageLoad]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            const file = e.dataTransfer.files[0];
            if (file && isImageFile(file)) {
                loadImage(file);
            } else if (file) {
                alert(`"${file.name}" is not a supported image format. Please use JPEG, PNG, WebP, HEIC, or other common image formats.`);
            }
        },
        [loadImage, isImageFile]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const input = e.currentTarget;
            const file = input.files?.[0];
            if (file) {
                console.log('[ImageDropzone] File selected:', file.name, file.type, file.size, 'bytes');
                if (isImageFile(file)) {
                    loadImage(file);
                } else {
                    alert(`"${file.name}" is not a supported image format. Please use JPEG, PNG, WebP, HEIC, or other common image formats.`);
                }
            }
            input.value = '';
        },
        [loadImage, isImageFile]
    );

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mobile-hero-dropzone relative flex-1 overflow-y-auto transition-colors duration-300 ${isDragging ? 'bg-signal-muted' : 'bg-paper'
                }`}
        >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-[-12rem] top-[-10rem] h-[24rem] w-[24rem] rounded-full bg-white/55 blur-3xl" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink-hairline to-transparent" />
            </div>

            <input
                id={inputId}
                type="file"
                accept="image/*,.heic,.heif,.webp,.avif,.tiff,.tif,.bmp,.raw,.cr2,.nef,.orf,.sr2"
                onChange={(e) => {
                    console.log('[ImageDropzone] Input onChange fired');
                    handleFileInput(e);
                }}
                className="sr-only"
            />
            <input
                id={cameraInputId}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="sr-only"
            />

            <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-10 lg:pb-16">
                <div className="flex items-center justify-center pb-2 sm:pb-4">
                    <div className="flex flex-col items-center">
                        <div className="font-wordmark text-center text-[2rem] leading-[0.9] tracking-[-0.05em] text-ink/80 sm:text-[2.75rem] lg:text-[3.25rem]">
                            <span>Color</span>
                            <span className="italic">Wizard</span>
                        </div>
                        <div
                            aria-hidden="true"
                            className="mt-3 flex h-1.5 w-28 overflow-hidden rounded-full border border-black/8 sm:w-40 lg:w-48"
                        >
                            {limitedPalette.map((paint) => (
                                <span
                                    key={paint.name}
                                    className="h-full flex-1"
                                    style={{ backgroundColor: paint.color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 items-center justify-center py-8 lg:py-10">
                    <section className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                        <h1 className="mt-10 max-w-[12ch] text-[3.4rem] font-medium leading-[0.9] tracking-[-0.07em] text-ink sm:text-[4.75rem] lg:text-[6rem]">
                            See a color.
                            <br />
                            Mix a color.
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-secondary sm:text-[1.25rem]">
                            Upload a photo, click any color, and get a real oil paint recipe.
                        </p>

                        <p className="mt-3 text-base text-ink-muted">
                            Made for painters, not designers.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <label
                                htmlFor={inputId}
                                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-signal px-7 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-signal-hover"
                            >
                                {isConverting ? 'Converting HEIC...' : 'Upload a Photo'}
                            </label>
                            <label
                                htmlFor={cameraInputId}
                                className="inline-flex cursor-pointer items-center justify-center rounded-full border border-ink-hairline bg-paper-elevated px-6 py-3 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-muted hover:bg-paper-recessed sm:hidden"
                            >
                                Take a Photo
                            </label>
                        </div>

                        <p className="mt-5 text-sm text-ink-muted">
                            Free forever. No uploads. No tracking.
                        </p>

                        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[12px] uppercase tracking-[0.18em] text-ink-faint sm:gap-4">
                            {proofPoints.map((item, index) => (
                                <div key={item} className="flex items-center gap-3 sm:gap-4">
                                    <span>{item}</span>
                                    {index < proofPoints.length - 1 && <span className="h-1 w-1 rounded-full bg-ink-faint" aria-hidden="true" />}
                                </div>
                            ))}
                        </div>

                        <div className="mt-16 w-full max-w-5xl rounded-[2rem] border border-ink-hairline bg-paper-elevated/70 p-5 shadow-md shadow-black/5 sm:p-6">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                                6-Color Limited Palette
                            </p>
                            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
                                {limitedPalette.map((paint) => (
                                    <div
                                        key={paint.name}
                                        className="rounded-[1.25rem] border border-ink-hairline bg-paper/85 p-2 text-center"
                                    >
                                        <div
                                            className="h-14 rounded-[0.9rem] border border-black/10 sm:h-16"
                                            style={{ backgroundColor: paint.color }}
                                            aria-hidden="true"
                                        />
                                        <p className="mt-2 text-[10px] font-medium leading-snug text-ink-secondary sm:text-[11px]">
                                            {paint.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-sm text-ink-muted">
                                Titanium White, Ivory Black, Yellow Ochre, Cadmium Red, Phthalo Green, Phthalo Blue.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
