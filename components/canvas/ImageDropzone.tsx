'use client';

import { useCallback, useState, useId } from 'react';
import ColorWizardSplashLottie from '@/components/splash/ColorWizardSplashLottie';
import { createSourceBuffer, decodeImage, decodeImageFile } from '@/lib/imagePipeline';
import { DEMO_COLOR_SWATCHES } from '@/lib/demoColor';

/**
 * Web workbench empty state: Lottie splash, title, and file picker (drag/drop supported).
 */

const CORE_LOOP_STEPS = [
    'Upload reference',
    'Sample color',
    'Mix / Threads / Pin',
];

interface ImageDropzoneProps {
    /** Called when an image is successfully loaded */
    onImageLoad: (img: HTMLImageElement) => void;
    /** Optional demo swatch — loads workbench with preset color */
    onTryDemoColor?: (hex: string) => void;
}

export default function ImageDropzone({ onImageLoad, onTryDemoColor }: ImageDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const inputId = useId();

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

            try {
                const oriented = await decodeImageFile(processedFile);
                const buffer = await createSourceBuffer(oriented);
                const dataUrl = buffer.toDataURL('image/png');
                const finalImg = await decodeImage(dataUrl);

                if (finalImg.width > 0 && finalImg.height > 0) {
                    console.log('[ImageDropzone] Image loaded successfully:', finalImg.width, 'x', finalImg.height);
                    onImageLoad(finalImg);
                } else {
                    console.warn('[ImageDropzone] Skipping onImageLoad for 0x0 image');
                    alert(`Failed to load image "${file.name}". The file decoded to an empty image.`);
                }
            } catch (e) {
                console.error('[ImageDropzone] Failed to load image:', {
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    error: e,
                });
                alert(`Failed to load image "${file.name}". Please try a different image format (JPEG, PNG, WebP, etc.).`);
            }
        },
        [onImageLoad]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        const next = e.relatedTarget as Node | null;
        if (next && e.currentTarget.contains(next)) return;
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
            className={`workspace-reference-dropzone relative flex-1 overflow-y-auto transition-colors duration-300 ${isDragging ? 'bg-[rgba(200,35,25,0.08)]' : 'bg-paper-shell'}`}
            role="region"
            aria-label="Load reference image"
        >
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
            <div
                className="pointer-events-none absolute inset-0 bg-[url('/textures/paper-grain.svg')] bg-[length:220px_220px] opacity-[0.22] mix-blend-multiply"
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,248,236,0.9),transparent_45%),linear-gradient(180deg,rgba(246,239,229,0.92),rgba(231,220,201,0.96))]"
                aria-hidden="true"
            />

            <div className="relative mx-auto flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 py-10">
                <ColorWizardSplashLottie className="mx-auto h-[min(58vw,300px)] w-[min(58vw,300px)] max-h-[300px] max-w-[300px]" />

                <h1 className="mt-8 font-display text-[clamp(2.5rem,7vw,3.75rem)] font-medium leading-none tracking-tight text-ink">
                    ColorWizard
                </h1>

                <p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-ink-secondary">
                    Sample a color. Get a limited-palette mix grounded in how light combines in paint.
                </p>

                <ol
                    aria-label="ColorWizard workflow"
                    className="mt-6 grid w-full max-w-sm grid-cols-3 border-y border-ink-hairline text-left"
                >
                    {CORE_LOOP_STEPS.map((step, index) => (
                        <li
                            key={step}
                            className="min-w-0 border-r border-ink-hairline px-3 py-2.5 last:border-r-0"
                        >
                            <span className="block font-mono text-[10px] font-semibold tabular-nums text-ink-faint">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="mt-1 block text-[10px] font-black uppercase leading-4 tracking-[0.14em] text-ink-muted">
                                {step}
                            </span>
                        </li>
                    ))}
                </ol>

                <label
                    htmlFor={inputId}
                    className={`studio-action mt-8 cursor-pointer px-8 py-3.5 transition-transform duration-200 ${isDragging ? 'scale-[1.02]' : ''}`}
                >
                    {isConverting ? 'Converting…' : 'Choose file'}
                </label>

                {onTryDemoColor && (
                    <div className="mt-8 w-full max-w-sm">
                        <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                            Try a demo color
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {DEMO_COLOR_SWATCHES.map((swatch) => (
                                <button
                                    key={swatch.hex}
                                    type="button"
                                    onClick={() => onTryDemoColor(swatch.hex)}
                                    aria-label={`Try demo color ${swatch.label}`}
                                    className="inline-flex items-center gap-2 rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.88)] px-3 py-2 text-[11px] font-semibold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <span
                                        className="h-5 w-5 shrink-0 rounded-full border border-black/10"
                                        style={{ backgroundColor: swatch.hex }}
                                        aria-hidden="true"
                                    />
                                    {swatch.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
