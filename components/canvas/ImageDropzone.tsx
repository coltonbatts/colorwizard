'use client';

import { useCallback, useState, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ReferenceWorkbenchIcon } from '@/components/workbenchIcons';
import { createSourceBuffer, decodeImage, decodeImageFile } from '@/lib/imagePipeline';

/**
 * Web workbench empty state: load a reference image (drag/drop or file picker).
 * Tool-first copy only — no marketing hero (Pro uses DesktopWorkspaceEmpty + neutral shell instead).
 */

interface ImageDropzoneProps {
    /** Called when an image is successfully loaded */
    onImageLoad: (img: HTMLImageElement) => void;
}

const trayMotion = {
    initial: { opacity: 0, y: 14, scale: 0.985 },
} as const;

const swatchColors = ['#b84235', '#d49a4c', '#e1c879', '#7c9457', '#4f8794', '#315778', '#312b23'];
const floatingSwatches: ReadonlyArray<{
    color: string;
    top: string;
    left?: string;
    right?: string;
    rotate: number;
    delay: number;
}> = [
    { color: '#ff6b57', top: '10%', left: '8%', rotate: -10, delay: 0.1 },
    { color: '#f7b24d', top: '18%', right: '8%', rotate: 8, delay: 0.24 },
    { color: '#f2df76', top: '62%', left: '6%', rotate: -8, delay: 0.34 },
    { color: '#79b96c', top: '70%', right: '12%', rotate: 10, delay: 0.16 },
    { color: '#42a7bf', top: '36%', left: '2%', rotate: -14, delay: 0.28 },
    { color: '#4363c9', top: '44%', right: '2%', rotate: 14, delay: 0.22 },
] as const;
const colorSignals = [
    { label: 'Paint recipe', value: '6-pigment mix' },
    { label: 'Thread match', value: 'DMC closest' },
    { label: 'Value read', value: 'Light to shadow' },
] as const;

function CameraIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.5 4.5 16 7h2.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-7A2.5 2.5 0 0 1 5.5 7H8l1.5-2.5h5Z" />
            <circle cx="12" cy="13" r="3.5" />
        </svg>
    );
}

function SparkIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v5" />
            <path d="M12 16v5" />
            <path d="m5.6 5.6 3.5 3.5" />
            <path d="m14.9 14.9 3.5 3.5" />
            <path d="M3 12h5" />
            <path d="M16 12h5" />
            <path d="m5.6 18.4 3.5-3.5" />
            <path d="m14.9 9.1 3.5-3.5" />
        </svg>
    );
}

export default function ImageDropzone({ onImageLoad }: ImageDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const inputId = useId();
    const cameraInputId = useId();
    const reduceMotion = useReducedMotion();

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
            <input
                id={cameraInputId}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="sr-only"
            />

            <div
                className="pointer-events-none absolute inset-0 bg-[url('/textures/paper-grain.svg')] bg-[length:220px_220px] opacity-[0.3] mix-blend-multiply"
                aria-hidden="true"
            />
            <motion.div
                className="pointer-events-none absolute inset-0 opacity-[0.16]"
                aria-hidden="true"
                animate={reduceMotion ? undefined : {
                    backgroundPosition: isDragging ? '18px 14px' : '0px 0px',
                }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(109,94,73,0.16) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(109,94,73,0.16) 1px, transparent 1px)
                    `,
                    backgroundSize: '36px 36px',
                }}
            />
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,248,236,0.88),transparent_28%),radial-gradient(circle_at_14%_88%,rgba(124,148,87,0.18),transparent_24%),radial-gradient(circle_at_86%_82%,rgba(79,135,148,0.18),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(108,63,178,0.14),transparent_22%),linear-gradient(180deg,rgba(246,239,229,0.82),rgba(231,220,201,0.86))]"
                aria-hidden="true"
            />

            <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 py-5 sm:px-8 sm:py-6">
                <header className="z-10 flex items-center justify-between gap-4">
                    <p className="font-display text-2xl leading-none text-ink">ColorWizard</p>
                    <p className="rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.66)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-graphite-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.64)]">
                        Local. Private.
                    </p>
                </header>

                <div className="flex flex-1 items-center justify-center py-5 sm:py-7">
                    <motion.section
                        initial={reduceMotion ? false : trayMotion.initial}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: reduceMotion ? 1 : isDragging ? 1.012 : 1,
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.85 }}
                        className={`studio-tray mx-auto w-full max-w-5xl p-3 transition-[border-color,box-shadow] duration-200 sm:p-4 ${isDragging ? 'border-signal/35 shadow-[0_34px_100px_rgba(33,24,14,0.18)]' : ''}`}
                    >
                        <div className={`studio-tray-recess relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8 lg:px-10 ${isDragging ? 'bg-paper-elevated' : ''}`}>
                            <motion.div
                                className="pointer-events-none absolute inset-x-4 top-4 h-32 rounded-[40px] opacity-90 blur-3xl sm:inset-x-8"
                                aria-hidden="true"
                                animate={reduceMotion ? undefined : {
                                    opacity: isDragging ? 1 : [0.8, 0.98, 0.84],
                                    scaleX: isDragging ? 1.06 : [1, 1.08, 1],
                                    x: isDragging ? 0 : ['-2%', '2%', '-1%'],
                                }}
                                transition={reduceMotion ? undefined : {
                                    duration: 8,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                                style={{
                                    background: 'linear-gradient(90deg, #ff5d45, #ffb243, #f4e26a, #70bf5f, #33aac9, #4168e6, #7b3fe0)',
                                }}
                            />

                            <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.96fr)] lg:gap-12">
                                <div className="relative z-10">
                                    <div className="mb-5 flex flex-wrap items-center gap-3">
                                        <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[20px] border border-ink-hairline bg-[rgba(255,252,247,0.78)] text-graphite shadow-[var(--shadow-tactile)]">
                                            {isDragging ? <SparkIcon /> : <ReferenceWorkbenchIcon aria-hidden="true" className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8b5b38]">
                                                Studio intake
                                            </p>
                                            <p className="mt-1 text-sm text-ink-secondary">
                                                Load a reference and start sampling immediately.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative mb-5 flex max-w-xl items-end gap-2 sm:gap-3" aria-hidden="true">
                                        {swatchColors.map((color, index) => (
                                            <motion.span
                                                key={color}
                                                className="studio-swatch-tile h-11 w-9 sm:h-14 sm:w-11"
                                                style={{ backgroundColor: color }}
                                                animate={reduceMotion ? undefined : {
                                                    y: isDragging ? [0, -7, -2] : [0, -3, 0],
                                                    rotate: isDragging ? [-1, 1.5, 0] : [0, -1, 0],
                                                }}
                                                transition={{
                                                    duration: 3.8,
                                                    delay: index * 0.12,
                                                    repeat: reduceMotion ? 0 : Infinity,
                                                    ease: 'easeInOut',
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-graphite-muted">
                                        Local color sampling for painters
                                    </p>
                                    <h1 className="mt-3 max-w-[10ch] font-display text-[clamp(2.9rem,6vw,5.05rem)] font-medium leading-[0.92] text-ink">
                                        {isDragging ? 'Release to load the image.' : 'Sample the color. Keep the image. Get the recipe.'}
                                    </h1>
                                    <p className="mt-5 max-w-[36rem] text-base leading-relaxed text-ink-secondary sm:text-lg">
                                        Drop in a painting, photo, or palette study. ColorWizard keeps it on-device and returns paint mixes, thread matches, and clean value reads without the usual tool friction.
                                    </p>

                                    <div className="mt-6 flex flex-wrap items-center gap-3">
                                        <motion.label
                                            htmlFor={inputId}
                                            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                            className="studio-action cursor-pointer px-6 py-3"
                                        >
                                            <ReferenceWorkbenchIcon aria-hidden="true" className="h-5 w-5" />
                                            {isConverting ? 'Converting HEIC...' : 'Choose image'}
                                        </motion.label>
                                        <motion.label
                                            htmlFor={cameraInputId}
                                            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                            className="studio-action studio-action-secondary cursor-pointer px-5 py-3 sm:hidden"
                                        >
                                            <CameraIcon />
                                            Camera
                                        </motion.label>
                                        <span className="rounded-full border border-[rgba(67,99,201,0.18)] bg-[rgba(67,99,201,0.08)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#3152bb]">
                                            No account required
                                        </span>
                                        <span className="rounded-full border border-[rgba(255,107,87,0.16)] bg-[rgba(255,107,87,0.08)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#b94a36]">
                                            Works entirely on-device
                                        </span>
                                    </div>

                                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                        {colorSignals.map((item) => (
                                            <div
                                                key={item.label}
                                                className="rounded-[20px] border border-[rgba(26,26,26,0.08)] bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(248,239,225,0.82))] px-4 py-3 shadow-[0_14px_32px_rgba(40,29,18,0.07)]"
                                            >
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-graphite-muted">
                                                    {item.label}
                                                </p>
                                                <p className="mt-2 text-sm font-semibold text-ink">
                                                    {item.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <motion.div
                                    className="relative mx-auto w-full max-w-[28rem]"
                                    initial={reduceMotion ? false : { opacity: 0, x: 18, scale: 0.98 }}
                                    animate={{ opacity: 1, x: 0, scale: isDragging ? 1.015 : 1 }}
                                    transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                                >
                                    <div className="relative aspect-[0.92] overflow-hidden rounded-[34px] border border-[rgba(49,87,120,0.18)] bg-[radial-gradient(circle_at_18%_18%,rgba(255,107,87,0.46),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(247,178,77,0.36),transparent_26%),radial-gradient(circle_at_50%_72%,rgba(67,99,201,0.36),transparent_34%),linear-gradient(160deg,rgba(255,247,236,0.98),rgba(235,223,205,0.94))] p-4 shadow-[0_36px_100px_rgba(36,26,16,0.18)]">
                                        <motion.div
                                            className="absolute inset-[10%] rounded-full border border-[rgba(255,255,255,0.68)] opacity-80"
                                            aria-hidden="true"
                                            animate={reduceMotion ? undefined : { rotate: 360 }}
                                            transition={reduceMotion ? undefined : { duration: 24, repeat: Infinity, ease: 'linear' }}
                                            style={{
                                                background: 'conic-gradient(from 0deg, rgba(255,107,87,0.3), rgba(247,178,77,0.12), rgba(67,99,201,0.28), rgba(255,107,87,0.3))',
                                            }}
                                        />
                                        <motion.div
                                            className="absolute inset-[20%] rounded-full border border-[rgba(49,87,120,0.18)]"
                                            aria-hidden="true"
                                            animate={reduceMotion ? undefined : { rotate: -360, scale: [1, 1.03, 1] }}
                                            transition={reduceMotion ? undefined : { duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                                        />

                                        {floatingSwatches.map((swatch) => (
                                            <motion.span
                                                key={`${swatch.color}-${swatch.top}`}
                                                className="absolute h-12 w-12 rounded-[16px] border border-[rgba(255,255,255,0.74)] shadow-[0_16px_24px_rgba(31,23,15,0.14)]"
                                                style={{
                                                    backgroundColor: swatch.color,
                                                    top: swatch.top,
                                                    left: swatch.left,
                                                    right: swatch.right,
                                                    rotate: `${swatch.rotate}deg`,
                                                }}
                                                aria-hidden="true"
                                                animate={reduceMotion ? undefined : {
                                                    y: [0, -10, 0],
                                                    x: [0, 4, 0],
                                                    rotate: [`${swatch.rotate}deg`, `${swatch.rotate + 4}deg`, `${swatch.rotate}deg`],
                                                }}
                                                transition={{
                                                    duration: 4.4,
                                                    delay: swatch.delay,
                                                    repeat: Infinity,
                                                    ease: 'easeInOut',
                                                }}
                                            />
                                        ))}

                                        <div className="relative flex h-full flex-col justify-between rounded-[28px] border border-[rgba(255,255,255,0.56)] bg-[rgba(255,251,245,0.66)] p-5 backdrop-blur-[12px]">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-graphite-muted">
                                                        Live color engine
                                                    </p>
                                                    <p className="mt-2 text-lg font-semibold text-ink">
                                                        Reference to usable paint in one pass
                                                    </p>
                                                </div>
                                                <motion.div
                                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(67,99,201,0.16)] bg-[rgba(255,255,255,0.7)] text-[#315778]"
                                                    animate={reduceMotion ? undefined : { scale: [1, 1.06, 1], rotate: [0, 6, 0] }}
                                                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                                                >
                                                    <SparkIcon />
                                                </motion.div>
                                            </div>

                                            <div className="space-y-3">
                                                {[
                                                    { label: 'Sample', width: '82%', gradient: 'from-[#ff6b57] via-[#f7b24d] to-[#f2df76]' },
                                                    { label: 'Analyze', width: '68%', gradient: 'from-[#79b96c] via-[#42a7bf] to-[#4363c9]' },
                                                    { label: 'Export', width: '76%', gradient: 'from-[#315778] via-[#4363c9] to-[#6c3fb2]' },
                                                ].map((row, index) => (
                                                    <div key={row.label} className="rounded-[22px] border border-[rgba(26,26,26,0.08)] bg-[rgba(255,255,255,0.72)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
                                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-graphite-muted">
                                                            <span>{row.label}</span>
                                                            <span>{index + 1}</span>
                                                        </div>
                                                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[rgba(26,26,26,0.08)]">
                                                            <motion.div
                                                                className={`h-full rounded-full bg-gradient-to-r ${row.gradient}`}
                                                                animate={reduceMotion ? { width: row.width } : { width: [row.width, `${Math.min(parseInt(row.width, 10) + 10, 92)}%`, row.width] }}
                                                                transition={{ duration: 3.6 + index * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="rounded-[18px] bg-[rgba(255,255,255,0.78)] px-2 py-3">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-graphite-muted">Privacy</p>
                                                    <p className="mt-1 text-sm font-semibold text-ink">Local</p>
                                                </div>
                                                <div className="rounded-[18px] bg-[rgba(255,255,255,0.78)] px-2 py-3">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-graphite-muted">Speed</p>
                                                    <p className="mt-1 text-sm font-semibold text-ink">Instant</p>
                                                </div>
                                                <div className="rounded-[18px] bg-[rgba(255,255,255,0.78)] px-2 py-3">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-graphite-muted">Output</p>
                                                    <p className="mt-1 text-sm font-semibold text-ink">Exportable</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        <div className="grid gap-2 px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-muted sm:grid-cols-3 sm:text-center">
                            <span className="rounded-full bg-[rgba(255,252,247,0.58)] px-3 py-2">No sign-up</span>
                            <span className="rounded-full bg-[rgba(255,252,247,0.58)] px-3 py-2">Images stay on this device</span>
                            <span className="rounded-full bg-[rgba(255,252,247,0.58)] px-3 py-2">Paint, thread, and value outputs</span>
                        </div>
                    </motion.section>
                </div>
            </div>
        </div>
    );
}
