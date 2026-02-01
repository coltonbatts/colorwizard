'use client';

import { useCallback, useState } from 'react';

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

    const loadImage = useCallback(
        (file: File) => {
            const reader = new FileReader();

            reader.onerror = () => {
                console.error('Failed to read file:', reader.error);
            };

            reader.onload = (event) => {
                const img = new Image();

                img.onerror = () => {
                    console.error('Failed to load image from file');
                };

                img.onload = () => {
                    console.log('[ImageDropzone] Image loaded successfully:', img.width, 'x', img.height);
                    onImageLoad(img);
                };

                img.src = event.target?.result as string;
            };

            reader.readAsDataURL(file);
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
            if (file && file.type.startsWith('image/')) {
                loadImage(file);
            }
        },
        [loadImage]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                console.log('[ImageDropzone] File selected:', file.name, file.type, file.size, 'bytes');
                loadImage(file);
            }
        },
        [loadImage]
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

                        <label className="cursor-pointer group block">
                            <span className="px-8 sm:px-10 md:px-12 py-4 md:py-5 bg-studio text-white rounded-full font-black uppercase tracking-widest hover:bg-studio/90 transition-all shadow-xl group-active:scale-95 inline-block text-sm sm:text-base">
                                Choose Image
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    console.log('[ImageDropzone] Input onChange fired');
                                    handleFileInput(e);
                                }}
                                className="absolute w-1 h-1 opacity-0 pointer-events-none"
                            />
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
