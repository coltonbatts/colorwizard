'use client';

import { useState } from 'react';
import { ARCanvas } from '@/components/ARCanvas';
import { ReferenceImageUploader } from '@/components/ReferenceImageUploader';

export default function TracePage() {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [opacity, setOpacity] = useState(50);
    const [showGrid, setShowGrid] = useState(false);
    const [gridType, setGridType] = useState<'thirds' | 'golden' | 'custom'>('thirds');
    const [showSidebar, setShowSidebar] = useState(true);

    // TODO: Get from user auth/tier
    const isPro = false;

    return (
        <div className="h-screen w-screen bg-black flex overflow-hidden">
            {/* Sidebar */}
            <div
                className={`bg-gray-800 transition-all duration-300 ${showSidebar ? 'w-80' : 'w-0'
                    } overflow-hidden`}
            >
                <div className="h-full flex flex-col p-4">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-white mb-2">AR Tracing</h1>
                        <p className="text-sm text-gray-400">
                            Upload a reference image and trace it using your camera
                        </p>
                    </div>

                    {/* Reference Images */}
                    <div className="flex-1 overflow-y-auto">
                        <ReferenceImageUploader
                            maxImages={5}
                            isPro={isPro}
                            onImageSelect={setSelectedImage}
                        />

                        {/* Grid Controls */}
                        <div className="mt-6 bg-gray-900 rounded-lg p-4">
                            <h3 className="text-white font-semibold mb-3">Grid Overlay</h3>

                            <label className="flex items-center gap-2 mb-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showGrid}
                                    onChange={(e) => setShowGrid(e.target.checked)}
                                    className="w-4 h-4 rounded"
                                />
                                <span className="text-gray-300 text-sm">Show Grid</span>
                            </label>

                            {showGrid && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gridType"
                                            value="thirds"
                                            checked={gridType === 'thirds'}
                                            onChange={() => setGridType('thirds')}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-gray-300 text-sm">Rule of Thirds</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gridType"
                                            value="golden"
                                            checked={gridType === 'golden'}
                                            onChange={() => setGridType('golden')}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-gray-300 text-sm">Golden Ratio</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Pro Features Teaser */}
                        {!isPro && (
                            <div className="mt-6 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg p-4 border border-blue-500/30">
                                <div className="flex items-start gap-3">
                                    <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-white font-semibold mb-1">Upgrade to Pro</h4>
                                        <p className="text-sm text-gray-300 mb-3">
                                            Get unlimited reference images, value breakdown mode, and advanced AR tracking for just <span className="font-bold text-blue-400">$1</span> (one-time, lifetime access)
                                        </p>
                                        <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                                            Unlock Pro Features
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main AR View */}
            <div className="flex-1 relative">
                <ARCanvas
                    referenceImage={selectedImage}
                    opacity={opacity}
                    showGrid={showGrid}
                    gridType={gridType}
                    onOpacityChange={setOpacity}
                />

                {/* Toggle sidebar button */}
                <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="absolute top-4 left-4 p-3 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors z-10"
                    title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showSidebar ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        )}
                    </svg>
                </button>

                {/* Info overlay */}
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
                    <p>Opacity: {opacity}%</p>
                </div>
            </div>
        </div>
    );
}
