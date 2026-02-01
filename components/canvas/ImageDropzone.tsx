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

export default function ImageDropzone({ onImageLoad }: ImageDropzoneProps) {
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
                
                // Convert to data URL to preserve image source (blob URLs get revoked)
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        img.src = dataUrl;
                        console.log('[ImageDropzone] Converted image to data URL');
                    } catch (e) {
                        console.warn('[ImageDropzone] Failed to convert to data URL:', e);
                    }
                }
                
                onImageLoad(img);
                URL.revokeObjectURL(objectUrl);
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
            className={`mobile-hero-dropzone flex-1 flex flex-col items-center justify-center transition-all duration-700 relative overflow-hidden ${isDragging
                ? 'bg-blue-50/50 scale-[0.98]'
                : 'bg-transparent'
                }`}
        >
            {/* Background Accent - Responsive sizing */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-blue-100/30 blur-[80px] md:blur-[120px] rounded-full -z-10 animate-pulse" />

            <div className="w-full max-w-4xl mx-auto px-4 z-10 flex flex-col items-center">
                <div className="text-center w-full">
                    {/* Wordmark - Responsive sizing for mobile */}
                    <div className="flex flex-col items-center mb-4 md:mb-8">
                        <h1 className="font-wordmark-hero text-studio select-none tracking-tight animate-in fade-in zoom-in-95 duration-1000">
                            Color Wizard
                        </h1>
                        <span className="text-[10px] font-mono opacity-20 tracking-widest mt-1">MOBILE_UPLOAD_FIX_V1</span>
                    </div>

                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-studio-secondary mb-6 md:mb-12 tracking-tight opacity-80 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 px-4">
                        The premium companion for light, value, and color analysis.
                    </p>

                    <div className={`
                        border-2 border-dashed rounded-2xl md:rounded-[3rem] p-6 sm:p-8 md:p-12 lg:p-16 transition-all duration-500
                        ${isDragging
                            ? 'border-blue-500 bg-white shadow-2xl scale-105'
                            : 'border-gray-200 bg-white/60 backdrop-blur-md shadow-xl hover:shadow-2xl hover:bg-white/70 md:hover:scale-[1.02]'
                        }
                        animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300
                    `}>
                        <p className="text-sm sm:text-base md:text-lg font-bold text-studio-secondary mb-4 md:mb-8 hidden sm:block">
                            Drop an image here to begin your analysis
                        </p>

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
                        <label htmlFor={inputId} className="cursor-pointer group block">
                            {isConverting ? (
                                <span className="px-8 sm:px-10 md:px-12 py-4 md:py-5 bg-studio/70 text-white rounded-full font-black uppercase tracking-widest inline-block text-sm sm:text-base">
                                    Converting HEIC...
                                </span>
                            ) : (
                                <span className="px-8 sm:px-10 md:px-12 py-4 md:py-5 bg-studio text-white rounded-full font-black uppercase tracking-widest hover:bg-studio/90 transition-all shadow-xl group-active:scale-95 inline-block text-sm sm:text-base">
                                    Choose Image
                                </span>
                            )}
                        </label>

                        <div className="mt-4 md:mt-8 flex items-center justify-center gap-3 md:gap-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-studio-dim">
                            <span>High Precision</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span className="hidden sm:inline">Instant Recipes</span>
                            <span className="hidden sm:inline w-1 h-1 bg-gray-300 rounded-full" />
                            <span>Pro Grade</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
