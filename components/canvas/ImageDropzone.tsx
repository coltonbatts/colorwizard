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
            className={`flex-1 flex flex-col items-center justify-center transition-all duration-700 relative overflow-hidden ${isDragging
                ? 'bg-blue-50/50 scale-[0.98]'
                : 'bg-transparent'
                }`}
        >
            {/* Background Accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/20 blur-[120px] rounded-full -z-10 animate-pulse" />

            <div className="text-center z-10 p-8 max-w-2xl">
                {/* Massive Wordmark */}
                <h1 className="text-7xl lg:text-9xl font-wordmark text-studio mb-8 select-none tracking-tight animate-in fade-in zoom-in-95 duration-1000">
                    Color Wizard
                </h1>

                <p className="text-xl lg:text-2xl font-medium text-studio-secondary mb-12 tracking-tight opacity-80 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    The premium companion for light, value, and color analysis.
                </p>

                <div className={`
                    border-2 border-dashed rounded-[3rem] p-12 lg:p-16 transition-all duration-500
                    ${isDragging
                        ? 'border-blue-500 bg-white shadow-2xl scale-105'
                        : 'border-gray-200 bg-white/40 backdrop-blur-md shadow-xl hover:shadow-2xl hover:bg-white/60 hover:scale-[1.02]'
                    }
                    animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300
                `}>
                    <p className="text-lg font-bold text-studio-secondary mb-8">
                        Drop an image here to begin your analysis
                    </p>

                    <label className="cursor-pointer group">
                        <span className="px-12 py-5 bg-studio text-white rounded-full font-black uppercase tracking-widest hover:bg-studio/90 transition-all shadow-xl group-active:scale-95 inline-block text-sm lg:text-base">
                            Choose Image
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileInput}
                            className="hidden"
                        />
                    </label>

                    <div className="mt-8 flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-studio-dim">
                        <span>High Precision</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>Instant Recipes</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>Professional Grade</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
