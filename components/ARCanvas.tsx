'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { CameraView } from './CameraView';

const DEBUG = true;

interface ARCanvasProps {
    referenceImage: string | null;
    opacity?: number;
    showGrid?: boolean;
    gridType?: 'thirds' | 'golden' | 'doodle';
    onOpacityChange?: (opacity: number) => void;
}

interface VideoBounds {
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
}

export function ARCanvas({
    referenceImage,
    opacity = 50,
    showGrid = false,
    gridType = 'thirds',
    onOpacityChange
}: ARCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [videoBounds, setVideoBounds] = useState<VideoBounds>({ offsetX: 0, offsetY: 0, width: 0, height: 0 });
    const [localOpacity, setLocalOpacity] = useState(opacity);
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

    // Generate random doodle shapes only once (memoized)
    const doodles = useMemo(() => {
        const shapes = [];
        for (let i = 0; i < 15; i++) {
            shapes.push({
                type: Math.random() > 0.6 ? 'squiggle' : (Math.random() > 0.5 ? 'circle' : 'triangle'),
                x: Math.random(),
                y: Math.random(),
                size: 0.05 + Math.random() * 0.1,
                rotation: Math.random() * Math.PI * 2,
                points: Array.from({ length: 5 }, () => ({
                    dx: (Math.random() - 0.5) * 0.1,
                    dy: (Math.random() - 0.5) * 0.1
                }))
            });
        }
        return shapes;
    }, []);

    // Update canvas size and compute video bounds when window resizes or video loads
    useEffect(() => {
        const updateCanvasSize = () => {
            const canvas = canvasRef.current;
            const videoContainer = videoContainerRef.current;
            if (!canvas || !videoContainer) return;

            const rect = videoContainer.getBoundingClientRect();
            const cssWidth = rect.width;
            const cssHeight = rect.height;

            // Set canvas CSS size
            canvas.style.width = `${cssWidth}px`;
            canvas.style.height = `${cssHeight}px`;

            // Set canvas bitmap size (scaled by DPR for crisp rendering on retina)
            canvas.width = cssWidth * dpr;
            canvas.height = cssHeight * dpr;

            setCanvasSize({ width: cssWidth, height: cssHeight });

            // Compute video bounds: where the video actually appears within the container
            // The video uses object-cover, which CROPS the image (not letterbox)
            // Formula: scale = max(containerW / videoW, containerH / videoH)
            const video = videoContainer.querySelector('video') as HTMLVideoElement;
            if (video && video.videoWidth && video.videoHeight) {
                const scale = Math.max(cssWidth / video.videoWidth, cssHeight / video.videoHeight);
                const scaledW = video.videoWidth * scale;
                const scaledH = video.videoHeight * scale;
                const offsetX = (cssWidth - scaledW) / 2;
                const offsetY = (cssHeight - scaledH) / 2;

                setVideoBounds({ offsetX, offsetY, width: scaledW, height: scaledH });
            } else {
                // If video dimensions not available yet, assume full container
                setVideoBounds({ offsetX: 0, offsetY: 0, width: cssWidth, height: cssHeight });
            }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        const container = videoContainerRef.current;
        if (!container) return () => window.removeEventListener('resize', updateCanvasSize);

        // Attach video event listeners when video element is found
        const attemptAttachVideoListeners = () => {
            const video = container.querySelector('video') as HTMLVideoElement | undefined;
            if (video) {
                video.addEventListener('loadedmetadata', updateCanvasSize);
                video.addEventListener('playing', updateCanvasSize);
                return true;
            }
            return false;
        };

        // Try to attach immediately (video may already be in DOM)
        if (attemptAttachVideoListeners()) {
            return () => window.removeEventListener('resize', updateCanvasSize);
        }

        // If video not found, watch for it to appear
        const observer = new MutationObserver(() => {
            if (attemptAttachVideoListeners()) {
                observer.disconnect();
            }
        });

        observer.observe(container, { childList: true, subtree: true });

        return () => {
            window.removeEventListener('resize', updateCanvasSize);
            observer.disconnect();
        };
    }, [dpr]);

    // Draw reference image and grid on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset and apply DPR transform before any drawing
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear canvas in CSS pixel space
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        // Draw reference image if provided
        if (referenceImage) {
            const img = new Image();
            img.onload = () => {
                ctx.globalAlpha = localOpacity / 100;

                // Calculate dimensions to fit image while maintaining aspect ratio
                const imgAspect = img.width / img.height;
                const videoAspect = videoBounds.width / videoBounds.height;

                let drawWidth, drawHeight, offsetX, offsetY;

                if (imgAspect > videoAspect) {
                    // Image is wider than video bounds
                    drawWidth = videoBounds.width;
                    drawHeight = videoBounds.width / imgAspect;
                    offsetX = videoBounds.offsetX;
                    offsetY = videoBounds.offsetY + (videoBounds.height - drawHeight) / 2;
                } else {
                    // Image is taller than video bounds
                    drawHeight = videoBounds.height;
                    drawWidth = videoBounds.height * imgAspect;
                    offsetX = videoBounds.offsetX + (videoBounds.width - drawWidth) / 2;
                    offsetY = videoBounds.offsetY;
                }

                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                ctx.globalAlpha = 1;

                // Draw grid if enabled
                if (showGrid) {
                    drawGrid(ctx, videoBounds);
                }
            };
            img.src = referenceImage;
        } else if (showGrid) {
            // Draw grid even without reference image
            drawGrid(ctx, videoBounds);
        }
    }, [referenceImage, localOpacity, showGrid, gridType, canvasSize, videoBounds, doodles]);

    const drawGrid = (ctx: CanvasRenderingContext2D, bounds: VideoBounds) => {
        const { offsetX, offsetY, width, height } = bounds;

        if (DEBUG) {
            // Debug overlay: Draw video bounds rectangle
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(offsetX, offsetY, width, height);
            ctx.setLineDash([]);

            // Debug overlay: Render debug text
            ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
            ctx.font = 'bold 12px monospace';
            const debugLines = [
                `DPR: ${dpr.toFixed(2)}`,
                `Video: ${canvasSize.width > 0 && videoBounds.width > 0 ? 'loaded' : 'loading'}`,
                `Bounds: x=${offsetX.toFixed(0)} y=${offsetY.toFixed(0)} w=${width.toFixed(0)} h=${height.toFixed(0)}`
            ];
            debugLines.forEach((line, i) => {
                ctx.fillText(line, offsetX + 10, offsetY + 25 + i * 16);
            });
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;

        if (gridType === 'thirds') {
            // Rule of thirds
            const thirdWidth = width / 3;
            const thirdHeight = height / 3;

            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(offsetX + thirdWidth, offsetY);
            ctx.lineTo(offsetX + thirdWidth, offsetY + height);
            ctx.moveTo(offsetX + thirdWidth * 2, offsetY);
            ctx.lineTo(offsetX + thirdWidth * 2, offsetY + height);

            // Horizontal lines
            ctx.moveTo(offsetX, offsetY + thirdHeight);
            ctx.lineTo(offsetX + width, offsetY + thirdHeight);
            ctx.moveTo(offsetX, offsetY + thirdHeight * 2);
            ctx.lineTo(offsetX + width, offsetY + thirdHeight * 2);
            ctx.stroke();
        } else if (gridType === 'golden') {
            // Golden ratio (approximately 1.618)
            const goldenWidth = width / 1.618;
            const goldenHeight = height / 1.618;

            ctx.beginPath();
            ctx.moveTo(offsetX + goldenWidth, offsetY);
            ctx.lineTo(offsetX + goldenWidth, offsetY + height);
            ctx.moveTo(offsetX + width - goldenWidth, offsetY);
            ctx.lineTo(offsetX + width - goldenWidth, offsetY + height);

            ctx.moveTo(offsetX, offsetY + goldenHeight);
            ctx.lineTo(offsetX + width, offsetY + goldenHeight);
            ctx.moveTo(offsetX, offsetY + height - goldenHeight);
            ctx.lineTo(offsetX + width, offsetY + height - goldenHeight);
            ctx.stroke();
        } else if (gridType === 'doodle') {
            // Doodle Grid (Random Shapes)
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
            ctx.lineWidth = 2;

            doodles.forEach(d => {
                const cx = offsetX + d.x * width;
                const cy = offsetY + d.y * height;
                const r = d.size * Math.min(width, height);

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(d.rotation);

                ctx.beginPath();
                if (d.type === 'circle') {
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                } else if (d.type === 'triangle') {
                    ctx.moveTo(0, -r);
                    ctx.lineTo(r * 0.866, r * 0.5);
                    ctx.lineTo(-r * 0.866, r * 0.5);
                    ctx.closePath();
                } else {
                    // Squiggle
                    ctx.moveTo(-r, 0);
                    ctx.bezierCurveTo(
                        -r/2, r,
                        r/2, -r,
                        r, 0
                    );
                }
                ctx.stroke();
                ctx.restore();
            });
        }
    };

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newOpacity = parseInt(e.target.value);
        setLocalOpacity(newOpacity);
        onOpacityChange?.(newOpacity);
    };

    return (
        <div ref={videoContainerRef} className="relative w-full h-full">
            {/* Camera feed */}
            <CameraView className="absolute inset-0" />

            {/* AR overlay canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
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
