'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { APP_MODE_LABEL } from '@/lib/appMode'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string
  currentCount?: number
  limit?: number
}

export default function UpgradeModal({
  isOpen,
  onClose,
  featureName,
  currentCount,
  limit,
}: UpgradeModalProps) {
  void currentCount
  void limit

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-gray-900"
        >
          <div className="absolute left-0 top-0 h-32 w-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 opacity-10" />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-8 pt-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20"
            >
              <span className="text-4xl">✨</span>
            </motion.div>

            <h2 className="mb-3 text-3xl font-black text-gray-900 dark:text-white">Free Forever</h2>

            {featureName && (
              <p className="mb-6 text-sm italic text-gray-600 dark:text-gray-400">
                {featureName} is now included without a checkout flow.
              </p>
            )}

            <div className="mb-8 rounded-2xl border border-purple-100 bg-purple-50 p-6 text-left dark:border-purple-800 dark:bg-purple-900/20">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300">
                <span className="text-xl">🎨</span> {APP_MODE_LABEL}
              </h3>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <li>Unlimited Procreate exports</li>
                <li>AI-powered color theory suggestions</li>
                <li>Local-first workflow with no account requirement</li>
                <li>No subscriptions. No payment prompts. Ever.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <p className="px-6 text-sm text-gray-500 dark:text-gray-400">
                Local is the product now. Everything stays on your machine, and the paid layer is turned off.
              </p>

              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 font-bold text-white shadow-xl shadow-purple-500/30 transition-all hover:from-purple-500 hover:to-pink-500"
              >
                <span>Continue</span>
              </button>

              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Payments disabled
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
