'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ArtistBadge - A floating brand badge that shares the ColorWizard origin story.
 * Lean into the "Indie Hacker / Single Maker" ethos to build competitive moat.
 */
export default function ArtistBadge() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* The Floating Badge */}
            <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-6 z-40 flex items-center gap-3 bg-white/80 backdrop-blur-md border border-gray-200 p-2 pr-4 rounded-full shadow-lg hover:shadow-xl transition-all group"
            >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-xl shadow-inner shadow-indigo-400/20">
                    👨‍🎨
                </div>
                <div className="text-left">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Built by an</p>
                    <p className="text-sm font-bold text-gray-900 leading-none">Artist for Artists</p>
                </div>
            </motion.button>

            {/* The Story Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors text-gray-500"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="p-8 sm:p-12">
                                <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center text-4xl mb-8">
                                    🖼️
                                </div>

                                <h2 className="text-4xl font-black text-gray-900 mb-6 leading-tight tracking-tight uppercase">
                                    The "Why" Behind <span className="text-indigo-600">ColorWizard</span>
                                </h2>

                                <div className="space-y-6 text-gray-600 leading-relaxed font-medium">
                                    <p>
                                        I'm an oil painter who was sick of "pro" tools that felt like cash-grabs.
                                        Most apps today charge **$30/year** just to project an image or save a palette.
                                        That's not right.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
                                        <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                            <p className="font-bold text-blue-900 mb-1 leading-tight uppercase text-xs tracking-widest">No Subscriptions</p>
                                            <p className="text-sm text-blue-800/80">Pay $1 once. Own it forever. That's how software used to be.</p>
                                        </div>
                                        <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100">
                                            <p className="font-bold text-purple-900 mb-1 leading-tight uppercase text-xs tracking-widest">Privacy First</p>
                                            <p className="text-sm text-purple-800/80">No tracking. No cloud logins. Your reference photos stay on your device.</p>
                                        </div>
                                    </div>

                                    <p>
                                        ColorWizard is my contribution to the art community. It's open-source, lightweight,
                                        and built to solve real problems I face in the studio.
                                    </p>

                                    <p className="font-bold text-gray-900 italic">
                                        Support the project for $1, and help me build the future of traditional art tools.
                                    </p>
                                </div>

                                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            // Trigger pricing or upgrade flow if needed
                                        }}
                                        className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black py-4 rounded-2xl shadow-xl hover:shadow-indigo-500/20 active:scale-95 transition-all uppercase tracking-tight"
                                    >
                                        Support for $1
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-200 active:scale-95 transition-all text-sm uppercase tracking-widest"
                                    >
                                        Back to Studio
                                    </button>
                                </div>

                                <div className="mt-8 text-center">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Created with ♥ by</p>
                                    <p className="text-sm font-black text-gray-900 leading-none">Colton Batts (@coltonbatts)</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
