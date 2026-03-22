/**
 * POST /api/stripe/webhook
 * Stripe webhooks have been disabled in open-source mode.
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  void req

  return NextResponse.json(
    {
      error: 'Stripe webhooks are disabled. ColorWizard is running in free open-source mode.',
    },
    { status: 410 }
  )
}
