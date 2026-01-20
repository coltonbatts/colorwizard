'use client';

import { useCallback, useState } from 'react';

/**
 * useFileLoader - Hook for handling image file loading via drag/drop or file picker.
 * Extracted from ImageCanvas.tsx for reusability.
 */

export interface UseFileLoaderReturn {
    /** Whether a file is currently being dragged over */
    isDragging: boolean;
    /** Whether an image is currently loading */
    isLoading: boolean;
    /** Load an image from a File object */
    loadImage: (file: File) => void;
    /** Handle drag over event */
    handleDragOver: (e: React.DragEvent) => void;
    /** Handle drag leave event */
    handleDragLeave: () => void;
    /** Handle drop event */
    handleDrop: (e: React.DragEvent) => void;
    /** Handle file input change event */
    handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useFileLoader(
    onImageLoad: (img: HTMLImageElement) => void
): UseFileLoaderReturn {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const loadImage = useCallback(
        (file: File) => {
            setIsLoading(true);
            const reader = new FileReader();

            reader.onerror = () => {
                console.error('Failed to read file:', reader.error);
                setIsLoading(false);
            };

            reader.onload = (event) => {
                const img = new Image();

                img.onerror = () => {
                    console.error('Failed to load image from file');
                    setIsLoading(false);
                };

                img.onload = () => {
                    onImageLoad(img);
                    setIsLoading(false);
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

    return {
        isDragging,
        isLoading,
        loadImage,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleFileInput,
    };
}
