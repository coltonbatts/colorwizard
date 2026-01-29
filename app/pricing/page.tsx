/**
 * Pricing Page
 * Standalone page showing pricing tiers
 */

'use client'

import { useState } from 'react'
import PricingModal from '@/components/PricingModal'

export default function PricingPage() {
  const [showPricingModal, setShowPricingModal] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <PricingModal isOpen={showPricingModal} onClose={() => window.history.back()} />
    </div>
  )
}
