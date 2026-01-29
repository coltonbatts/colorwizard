/**
 * Dashboard / Upgrade Success Page
 */

import { Suspense } from 'react'
import DashboardContent from './dashboard-content'

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
