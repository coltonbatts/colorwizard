'use client';

import { motion } from 'framer-motion';

/**
 * SocialProofBadge - Subtle credibility for the $1 offer.
 */
export default function SocialProofBadge() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 }}
            className="fixed bottom-6 left-6 z-40"
        >
            <div className="bg-white/80 backdrop-blur-md border border-gray-100 px-4 py-2 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px]">
                            {['👩‍🎨', '👨‍🎨', '🧑‍🎨'][i - 1]}
                        </div>
                    ))}
                </div>
                <div className="text-left">
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight leading-none">Joined by 500+ Artists</p>
                    <p className="text-[9px] font-bold text-gray-400 leading-none mt-1">Limited $1 Launch Offer</p>
                </div>
            </div>
        </motion.div>
    );
}
