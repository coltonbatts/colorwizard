/**
 * useCanvasTransform - Generic zoom/pan logic for canvas interactions.
 * Extracted from ImageCanvas.tsx for reusability and maintainability.
 */
'use client';

import { useState, useCallback, useEffect, useRef, RefObject } from 'react';
import { useMotionValue, useSpring, MotionValue } from 'framer-motion';

export interface CanvasTransform {
    zoomLevel: number;
    panOffset: { x: number; y: number };
}

export interface UseCanvasTransformOptions {
    minZoom?: number;
    maxZoom?: number;
    zoomStep?: number;
    wheelSensitivity?: number;
    /** Enable spring physics for smooth transitions */
    springPhysics?: boolean;
}

export interface UseCanvasTransformReturn {
    /** Current zoom level (1 = 100%) */
    zoomLevel: number;
    /** Pan offset from origin */
    panOffset: { x: number; y: number };
    /** Animated zoom value (framer-motion) */
    animatedZoom: MotionValue<number>;
    /** Animated pan X (framer-motion) */
    animatedPanX: MotionValue<number>;
    /** Animated pan Y (framer-motion) */
    animatedPanY: MotionValue<number>;
    /** Whether currently panning */
    isPanning: boolean;
    /** Whether spacebar is held (pan mode) */
    isSpaceDown: boolean;
    /** Zoom to a specific level centered on a point */
    zoomAtPoint: (newZoom: number, centerX: number, centerY: number) => void;
    /** Reset view to initial state */
    resetView: () => void;
    /** Fit content to view */
    fitToView: () => void;
    /** Handle mouse down for panning */
    handleMouseDown: (e: React.MouseEvent) => void;
    /** Handle mouse move for panning */
    handleMouseMove: (e: React.MouseEvent) => void;
    /** Handle mouse up */
    handleMouseUp: (e: React.MouseEvent) => void;
    /** Handle mouse leave */
    handleMouseLeave: () => void;
    /** Whether the mouse was dragged (vs clicked) */
    hasDragged: boolean;
    /** Last pan point ref for external use */
    lastPanPoint: RefObject<{ x: number; y: number }>;
}

const DEFAULT_OPTIONS: Required<UseCanvasTransformOptions> = {
    minZoom: 0.1,
    maxZoom: 10,
    zoomStep: 0.1,
    wheelSensitivity: 0.001,
    springPhysics: true,
};

export function useCanvasTransform(
    canvasRef: RefObject<HTMLCanvasElement | null>,
    options: UseCanvasTransformOptions = {}
): UseCanvasTransformReturn {
    const config = { ...DEFAULT_OPTIONS, ...options };

    // Core state
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [isSpaceDown, setIsSpaceDown] = useState(false);
    const [hasDragged, setHasDragged] = useState(false);

    // Refs for panning
    const lastPanPoint = useRef({ x: 0, y: 0 });
    const dragStartRef = useRef({ x: 0, y: 0 });
    const hasDraggedRef = useRef(false);

    // Framer-motion spring values for smooth animations
    const rawZoom = useMotionValue(1);
    const rawPanX = useMotionValue(0);
    const rawPanY = useMotionValue(0);

    const springConfig = { stiffness: 300, damping: 30, mass: 0.5 };
    const animatedZoom = useSpring(rawZoom, config.springPhysics ? springConfig : { stiffness: 1000, damping: 100 });
    const animatedPanX = useSpring(rawPanX, config.springPhysics ? springConfig : { stiffness: 1000, damping: 100 });
    const animatedPanY = useSpring(rawPanY, config.springPhysics ? springConfig : { stiffness: 1000, damping: 100 });

    // Sync state with motion values
    useEffect(() => {
        rawZoom.set(zoomLevel);
    }, [zoomLevel, rawZoom]);

    useEffect(() => {
        rawPanX.set(panOffset.x);
        rawPanY.set(panOffset.y);
    }, [panOffset, rawPanX, rawPanY]);

    // Zoom centered on a point
    const zoomAtPoint = useCallback(
        (newZoom: number, centerX: number, centerY: number) => {
            const clampedZoom = Math.min(config.maxZoom, Math.max(config.minZoom, newZoom));
            const zoomRatio = clampedZoom / zoomLevel;

            // Adjust pan to keep the point under cursor stationary
            const newPanX = centerX - (centerX - panOffset.x) * zoomRatio;
            const newPanY = centerY - (centerY - panOffset.y) * zoomRatio;

            setZoomLevel(clampedZoom);
            setPanOffset({ x: newPanX, y: newPanY });
        },
        [zoomLevel, panOffset, config.minZoom, config.maxZoom]
    );

    // Reset view
    const resetView = useCallback(() => {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
    }, []);

    // Fit to view (alias for reset)
    const fitToView = useCallback(() => {
        resetView();
    }, [resetView]);

    // Mouse wheel zoom handler
    const handleWheel = useCallback(
        (e: WheelEvent) => {
            e.preventDefault();

            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const cursorX = (e.clientX - rect.left) * scaleX;
            const cursorY = (e.clientY - rect.top) * scaleY;

            const delta = -e.deltaY * config.wheelSensitivity;
            const newZoom = zoomLevel * (1 + delta);

            zoomAtPoint(newZoom, cursorX, cursorY);
        },
        [zoomLevel, zoomAtPoint, canvasRef, config.wheelSensitivity]
    );

    // Attach wheel listener
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [handleWheel, canvasRef]);

    // Keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Spacebar for pan mode
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                setIsSpaceDown(true);
            }

            // + / = for zoom in
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                const canvas = canvasRef.current;
                if (canvas) {
                    const centerX = canvas.width / 2;
                    const centerY = canvas.height / 2;
                    zoomAtPoint(zoomLevel + config.zoomStep, centerX, centerY);
                }
            }

            // - for zoom out
            if (e.key === '-') {
                e.preventDefault();
                const canvas = canvasRef.current;
                if (canvas) {
                    const centerX = canvas.width / 2;
                    const centerY = canvas.height / 2;
                    zoomAtPoint(zoomLevel - config.zoomStep, centerX, centerY);
                }
            }

            // 0 to reset view
            if (e.key === '0') {
                e.preventDefault();
                resetView();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpaceDown(false);
                setIsPanning(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [zoomLevel, zoomAtPoint, resetView, canvasRef, config.zoomStep]);

    // Mouse handlers for panning
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (e.button === 0 || e.button === 1 || isSpaceDown) {
                e.preventDefault();
                setIsPanning(true);
                lastPanPoint.current = { x: e.clientX, y: e.clientY };
                dragStartRef.current = { x: e.clientX, y: e.clientY };
                hasDraggedRef.current = false;
                setHasDragged(false);
            }
        },
        [isSpaceDown]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isPanning) return;

            // Check for drag threshold
            if (!hasDraggedRef.current) {
                const dist = Math.hypot(
                    e.clientX - dragStartRef.current.x,
                    e.clientY - dragStartRef.current.y
                );
                if (dist > 3) {
                    hasDraggedRef.current = true;
                    setHasDragged(true);
                }
            }

            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const deltaX = (e.clientX - lastPanPoint.current.x) * scaleX;
            const deltaY = (e.clientY - lastPanPoint.current.y) * scaleY;

            setPanOffset((prev) => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY,
            }));

            lastPanPoint.current = { x: e.clientX, y: e.clientY };
        },
        [isPanning, canvasRef]
    );

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsPanning(false);
    }, []);

    return {
        zoomLevel,
        panOffset,
        animatedZoom,
        animatedPanX,
        animatedPanY,
        isPanning,
        isSpaceDown,
        zoomAtPoint,
        resetView,
        fitToView,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleMouseLeave,
        hasDragged,
        lastPanPoint,
    };
}
