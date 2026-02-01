'use client';

import { useEffect } from 'react';
import { useCamera } from '@/lib/camera/useCamera';

interface CameraViewProps {
    onStreamReady?: (stream: MediaStream) => void;
    facingMode?: 'user' | 'environment';
    className?: string;
}

export function CameraView({ onStreamReady, facingMode = 'environment', className = '' }: CameraViewProps) {
    const { stream, error, isLoading, hasPermission, videoRef, startCamera, stopCamera, switchCamera } = useCamera({ facingMode });

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    useEffect(() => {
        if (stream && onStreamReady) {
            onStreamReady(stream);
        }
    }, [stream, onStreamReady]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white">Starting camera...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-gray-900">
                <div className="text-center max-w-md px-6">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h3 className="text-white text-xl font-bold mb-2">Camera Error</h3>
                    <p className="text-gray-300 mb-4">{error.message}</p>
                    {error.type === 'permission_denied' && (
                        <div className="bg-gray-800 rounded-lg p-4 text-left text-sm text-gray-300">
                            <p className="font-semibold mb-2">How to fix:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Click the camera icon in your browser&apos;s address bar</li>
                                <li>Select &quot;Allow&quot; for camera access</li>
                                <li>Refresh this page</li>
                            </ol>
                        </div>
                    )}
                    <button
                        onClick={startCamera}
                        className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative w-full h-full ${className}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
            />

            {/* Camera controls overlay */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                    onClick={switchCamera}
                    className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                    title="Switch camera"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
