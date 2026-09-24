import type { Metadata } from 'next'
import SimpleApp from '@/components/simple/SimpleApp'

export const metadata: Metadata = {
  title: 'ColorWizard',
  description: 'Open a picture. Click any color. See what it is, how to mix it, and which thread matches.',
}

export default function SimplePage() {
  return <SimpleApp />
}
