'use client';

import { useState, useRef, useEffect } from 'react';
import { CameraView } from './CameraView';

interface ARCanvasProps {
    referenceImage: string | null;
    opacity?: number;
    showGrid?: boolean;
    gridType?: 'thirds' | 'golden' | 'custom';
    onOpacityChange?: (opacity: number) => void;
}

export function ARCanvas({
    referenceImage,
    opacity = 50,
    showGrid = false,
    gridType = 'thirds',
    onOpacityChange
}: ARCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [localOpacity, setLocalOpacity] = useState(opacity);

    // Update canvas size when window resizes
    useEffect(() => {
        const updateCanvasSize = () => {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setCanvasSize({ width: rect.width, height: rect.height });
                canvasRef.current.width = rect.width;
                canvasRef.current.height = rect.height;
            }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, []);

    // Draw reference image and grid on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw reference image if provided
        if (referenceImage) {
            const img = new Image();
            img.onload = () => {
                ctx.globalAlpha = localOpacity / 100;

                // Calculate dimensions to fit image while maintaining aspect ratio
                const imgAspect = img.width / img.height;
                const canvasAspect = canvas.width / canvas.height;

                let drawWidth, drawHeight, offsetX, offsetY;

                if (imgAspect > canvasAspect) {
                    // Image is wider than canvas
                    drawWidth = canvas.width;
                    drawHeight = canvas.width / imgAspect;
                    offsetX = 0;
                    offsetY = (canvas.height - drawHeight) / 2;
                } else {
                    // Image is taller than canvas
                    drawHeight = canvas.height;
                    drawWidth = canvas.height * imgAspect;
                    offsetX = (canvas.width - drawWidth) / 2;
                    offsetY = 0;
                }

                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                ctx.globalAlpha = 1;

                // Draw grid if enabled
                if (showGrid) {
                    drawGrid(ctx, canvas.width, canvas.height, gridType);
                }
            };
            img.src = referenceImage;
        } else if (showGrid) {
            // Draw grid even without reference image
            drawGrid(ctx, canvas.width, canvas.height, gridType);
        }
    }, [referenceImage, localOpacity, showGrid, gridType, canvasSize]);

    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, type: string) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;

        if (type === 'thirds') {
            // Rule of thirds
            const thirdWidth = width / 3;
            const thirdHeight = height / 3;

            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(thirdWidth, 0);
            ctx.lineTo(thirdWidth, height);
            ctx.moveTo(thirdWidth * 2, 0);
            ctx.lineTo(thirdWidth * 2, height);

            // Horizontal lines
            ctx.moveTo(0, thirdHeight);
            ctx.lineTo(width, thirdHeight);
            ctx.moveTo(0, thirdHeight * 2);
            ctx.lineTo(width, thirdHeight * 2);
            ctx.stroke();
        } else if (type === 'golden') {
            // Golden ratio (approximately 1.618)
            const goldenWidth = width / 1.618;
            const goldenHeight = height / 1.618;

            ctx.beginPath();
            ctx.moveTo(goldenWidth, 0);
            ctx.lineTo(goldenWidth, height);
            ctx.moveTo(width - goldenWidth, 0);
            ctx.lineTo(width - goldenWidth, height);

            ctx.moveTo(0, goldenHeight);
            ctx.lineTo(width, goldenHeight);
            ctx.moveTo(0, height - goldenHeight);
            ctx.lineTo(width, height - goldenHeight);
            ctx.stroke();
        }
    };

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newOpacity = parseInt(e.target.value);
        setLocalOpacity(newOpacity);
        onOpacityChange?.(newOpacity);
    };

    return (
        <div className="relative w-full h-full">
            {/* Camera feed */}
            <CameraView className="absolute inset-0" />

            {/* AR overlay canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Opacity control */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={localOpacity}
                    onChange={handleOpacityChange}
                    className="w-48 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    disabled={!referenceImage}
                />
                <span className="text-white font-medium min-w-[3rem] text-right">
                    {localOpacity}%
                </span>
            </div>

            {/* No reference image message */}
            {!referenceImage && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="bg-black/70 backdrop-blur-sm rounded-lg px-8 py-6 text-white">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg font-medium">No reference image loaded</p>
                        <p className="text-sm text-gray-300 mt-2">Upload an image to start tracing</p>
                    </div>
                </div>
            )}
        </div>
    );
}
