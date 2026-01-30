'use client';

import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { getPaint } from '@/lib/paint/catalog';

interface SharePaletteButtonProps {
    paintIds: string[];
    paletteName: string;
    className?: string;
}

interface ResolvedColor {
    hex: string;
    name: string;
}

/**
 * SharePaletteButton - Generates a beautiful, shareable image of a palette.
 * Inclues a viral watermark and "Built for Artists" branding.
 */
export default function SharePaletteButton({ paintIds, paletteName, className = '' }: SharePaletteButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [resolvedColors, setResolvedColors] = useState<ResolvedColor[]>([]);
    const hiddenRef = useRef<HTMLDivElement>(null);

    // Resolve paint IDs to hex codes and names on mount/change
    useEffect(() => {
        async function resolve() {
            if (paintIds.length === 0) return;
            const colors: ResolvedColor[] = [];
            for (const id of paintIds) {
                try {
                    const paint = await getPaint(id);
                    if (paint) {
                        colors.push({ hex: paint.hex, name: paint.name });
                    }
                } catch (e) {
                    console.error('Failed to resolve paint color:', id, e);
                }
            }
            setResolvedColors(colors);
        }
        resolve();
    }, [paintIds]);

    const handleShare = async () => {
        if (!hiddenRef.current || resolvedColors.length === 0) return;

        try {
            setIsGenerating(true);

            // Allow DOM to be absolutely sure it's ready
            await new Promise(r => setTimeout(r, 200));

            // Generate high-resolution PNG
            const dataUrl = await toPng(hiddenRef.current, {
                cacheBust: true,
                quality: 1,
                pixelRatio: 2, // 2x for retina-like sharpness
                style: {
                    display: 'flex', // Ensure it's rendered for capture
                }
            });

            // Trigger download
            const link = document.createElement('a');
            link.download = `palette-${paletteName.toLowerCase().replace(/\s+/g, '-')}.png`;
            link.href = dataUrl;
            link.click();

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 4000);

            // Social Sharing Loop: Open Twitter/X with pre-filled content
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `Just crafted this color palette "${paletteName}" for my next painting! 🎨✨\n\nBuilt with ColorWizard (privacy-first, $1 lifetime Pro).\n\nCheck it out: https://colorwizard.app\n\n#ColorWizard #Painting #ColorTheory #IndieDev`
            )}`;
            window.open(twitterUrl, '_blank');

        } catch (err) {
            console.error('Failed to generate sharing image:', err);
            alert('Failed to generate image. Please try again or take a screenshot!');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <button
                onClick={handleShare}
                disabled={isGenerating || resolvedColors.length === 0}
                className={`flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                title="Share this palette as a beautiful image"
            >
                {isGenerating ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                )}
                <span>Share Palette</span>
            </button>

            {/* Hidden Capture Area - High Res Template */}
            <div className="fixed left-[-9999px] top-[-9999px] pointer-events-none select-none">
                <div
                    ref={hiddenRef}
                    className="w-[1200px] h-[630px] bg-white p-14 flex flex-col justify-between"
                >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-8xl font-black text-gray-900 mb-2 leading-none uppercase tracking-tighter">
                                {paletteName}
                            </h1>
                            <p className="text-2xl text-gray-400 font-bold uppercase tracking-[0.3em] ml-1">
                                Color Inspiration
                            </p>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="text-4xl font-black text-blue-600 tracking-tighter uppercase leading-none mb-1">ColorWizard</div>
                            <div className="text-xl font-bold text-gray-400">colorwizard.app</div>
                        </div>
                    </div>

                    {/* Color Swatches Grid */}
                    <div className="flex-1 flex gap-8 my-10 min-h-0">
                        {resolvedColors.slice(0, 10).map((color, i) => (
                            <div
                                key={i}
                                className="flex-1 flex flex-col min-w-0"
                            >
                                <div
                                    className="flex-1 rounded-[2.5rem] mb-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] border-8 border-gray-50/50"
                                    style={{ backgroundColor: color.hex }}
                                />
                                <div className="text-center">
                                    <div className="text-xl font-black text-gray-900 uppercase truncate px-2 mb-1">
                                        {color.name}
                                    </div>
                                    <div className="text-lg font-mono font-bold text-gray-400">
                                        {color.hex.toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer / Watermark */}
                    <div className="flex items-center justify-between border-t-8 border-gray-50 pt-12">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-200">
                                <span className="text-4xl drop-shadow-md">🎨</span>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-gray-900 uppercase tracking-tight">Built for Artists</div>
                                <div className="text-lg font-bold text-gray-400 italic">Privacy-first • Open Source • $1 Forever</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Made with Passion</p>
                            <p className="text-3xl font-black text-indigo-600/20 uppercase tracking-tighter">coltonbatts/colorwizard</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Celebration Notification */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.2 } }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-xl text-white px-8 py-5 rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(67,56,202,0.4)] border border-white/10 flex items-center gap-5 z-[200]"
                    >
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg ring-4 ring-indigo-500/20">
                            ✨
                        </div>
                        <div className="flex flex-col">
                            <p className="font-black text-lg leading-tight uppercase tracking-tight">Palette Shared!</p>
                            <p className="text-sm text-gray-400 font-medium">Image downloaded. Spreading the word on X...</p>
                        </div>
                        <button
                            onClick={() => setShowSuccess(false)}
                            className="ml-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
