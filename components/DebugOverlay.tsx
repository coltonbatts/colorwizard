'use client';

import React from 'react';

interface DebugOverlayProps {
    isVisible: boolean;
    metrics: {
        originalWidth: number;
        originalHeight: number;
        bufferWidth: number;
        bufferHeight: number;
        displayWidth: number;
        displayHeight: number;
        dpr: number;
    } | null;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ isVisible, metrics }) => {
    if (!isVisible || !metrics) return null;

    return (
        <div className="fixed top-4 left-4 z-[9999] bg-black/80 text-white p-3 rounded-lg border border-white/20 font-mono text-[10px] pointer-events-none">
            <h4 className="text-blue-400 font-bold mb-1 border-b border-blue-400/30 pb-1">MOB_STABILIZE_LOG</h4>
            <div className="space-y-1">
                <p>ORIG_IMG: {metrics.originalWidth}x{metrics.originalHeight}</p>
                <p>SRC_BUFF: {metrics.bufferWidth}x{metrics.bufferHeight}</p>
                <p>DISP_CAN: {metrics.displayWidth}x{metrics.displayHeight}</p>
                <p>DEV_DPR : {metrics.dpr.toFixed(2)}</p>
                <p>RATIO   : {(metrics.bufferWidth / metrics.originalWidth).toFixed(3)}</p>
                <div className="mt-2 text-[8px] text-gray-400 uppercase tracking-tighter">
                    Status: <span className="text-green-500">Normal</span>
                </div>
            </div>
        </div>
    );
};
