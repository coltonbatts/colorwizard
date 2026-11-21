import type { Metadata } from 'next'
import SimpleApp from '@/components/simple/SimpleApp'

export const metadata: Metadata = {
  title: 'DMC Thread Studio — ColorWizard',
  description: 'Match DMC embroidery threads from a photo, browse all 488 shades by warmth and value, check grayscale steps, and find smooth bridge shades for needle painting.',
}

export default function ThreadPage() {
  return <SimpleApp initialSection="thread" />
}
