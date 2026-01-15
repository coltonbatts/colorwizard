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
            className={`flex-1 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 bg-gray-800/50'
                }`}
        >
            <div className="text-center">
                <p className="text-xl text-gray-400 mb-4">
                    Drop an image here or click to browse
                </p>
                <label className="cursor-pointer">
                    <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white inline-block transition-colors">
                        Choose Image
                    </span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                    />
                </label>
            </div>
        </div>
    );
}
