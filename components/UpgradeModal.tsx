'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STRIPE_PRICES } from '@/lib/stripe-config';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
    currentCount?: number;
    limit?: number;
}

export default function UpgradeModal({
    isOpen,
    onClose,
    featureName,
    currentCount,
    limit,
}: UpgradeModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleUpgrade = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }
        } catch (err) {
            console.error('Upgrade error:', err);
            alert('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden"
                >
                    {/* Decorative Background */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 opacity-10" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="p-8 pt-12 text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20"
                        >
                            <span className="text-4xl">✨</span>
                        </motion.div>

                        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
                            Unlock the Full Magic
                        </h2>

                        {featureName && (
                            <p className="text-gray-600 dark:text-gray-400 mb-6 italic text-sm">
                                You&apos;re trying to export {currentCount} colors, but the free tier limit is {limit}.
                            </p>
                        )}

                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 mb-8 text-left border border-purple-100 dark:border-purple-800">
                            <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-4 flex items-center gap-2">
                                <span className="text-xl">🎨</span> Lifetime Pro Benefits:
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    'Unlimited Procreate exports (30 colors)',
                                    'AR Tracing for your physical canvas',
                                    'AI-powered color theory suggestions',
                                    'Figma, Adobe, and Framer exports',
                                    'No subscriptions. No tracking. Ever.',
                                ].map((item, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + i * 0.1 }}
                                        className="flex items-start gap-3 text-gray-700 dark:text-gray-300 text-sm"
                                    >
                                        <span className="text-green-500 mt-0.5">✓</span>
                                        <span>{item}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <p className="text-gray-500 dark:text-gray-400 text-sm px-6">
                                &quot;I&apos;m just one dev building this for artists. For the price of <span className="text-gray-900 dark:text-white font-semibold">half a coffee</span>, you help me keep the lights on and unlock every feature forever.&quot; — Colton
                            </p>

                            <button
                                onClick={handleUpgrade}
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-xl shadow-purple-500/30 flex items-center justify-center gap-3 group disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Unlock Lifetime Pro for {STRIPE_PRICES.lifetime.displayLabel}</span>
                                        <motion.span
                                            animate={{ x: [0, 5, 0] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                        >
                                            🚀
                                        </motion.span>
                                    </>
                                )}
                            </button>

                            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                One-time payment • Secure checkout via Stripe
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
