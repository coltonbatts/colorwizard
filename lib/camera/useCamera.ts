'use client';

import { useState, useEffect, useRef } from 'react';

export interface CameraConfig {
    facingMode: 'user' | 'environment';
    width?: number;
    height?: number;
}

export interface CameraError {
    type: 'permission_denied' | 'not_found' | 'not_supported' | 'unknown';
    message: string;
}

export function useCamera(config: CameraConfig = { facingMode: 'environment' }) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<CameraError | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const startCamera = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Check if mediaDevices is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera not supported in this browser');
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: config.facingMode,
                    width: config.width ? { ideal: config.width } : { ideal: 1920 },
                    height: config.height ? { ideal: config.height } : { ideal: 1080 },
                },
                audio: false,
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            setHasPermission(true);

            // Attach stream to video element if ref exists
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            console.error('Camera error:', err);

            let cameraError: CameraError;

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                cameraError = {
                    type: 'permission_denied',
                    message: 'Camera permission denied. Please allow camera access in your browser settings.',
                };
                setHasPermission(false);
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                cameraError = {
                    type: 'not_found',
                    message: 'No camera found on this device.',
                };
            } else if (err.message?.includes('not supported')) {
                cameraError = {
                    type: 'not_supported',
                    message: 'Camera not supported in this browser. Try Chrome or Safari.',
                };
            } else {
                cameraError = {
                    type: 'unknown',
                    message: err.message || 'Failed to access camera. Please try again.',
                };
            }

            setError(cameraError);
        } finally {
            setIsLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        }
    };

    const switchCamera = async () => {
        stopCamera();
        const newFacingMode = config.facingMode === 'user' ? 'environment' : 'user';
        config.facingMode = newFacingMode;
        await startCamera();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return {
        stream,
        error,
        isLoading,
        hasPermission,
        videoRef,
        startCamera,
        stopCamera,
        switchCamera,
    };
}
