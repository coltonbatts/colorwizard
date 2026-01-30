'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LaunchBanner - A sticky celebratory banner for Product Hunt launch.
 * Designed to build momentum and highlight the "Launch Special" $1 offer.
 */
export default function LaunchBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show banner after a short delay for impact
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[200] px-4 py-3"
                >
                    <div className="max-w-6xl mx-auto bg-gradient-to-r from-orange-500 via-pink-600 to-indigo-600 rounded-2xl shadow-2xl shadow-pink-500/20 border border-white/20 backdrop-blur-md overflow-hidden flex items-center justify-between p-1 pl-6 pr-2">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl animate-bounce">🚀</span>
                            <div className="hidden sm:block">
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">We're Live on</p>
                                <p className="text-sm font-black text-white leading-none tracking-tight">Product Hunt! Launch Special: $1 Lifetime Pro</p>
                            </div>
                            <div className="sm:hidden">
                                <p className="text-xs font-black text-white leading-tight">PH Launch Special: $1 Pro</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href="https://www.producthunt.com/posts/color-wizard"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-white text-pink-600 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-orange-50 transition-colors shadow-lg"
                            >
                                Support Us
                            </a>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
