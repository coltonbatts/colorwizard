'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import splashAnimation from '../../public/lottie/splash.json'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface ColorWizardSplashLottieProps {
  className?: string
}

export default function ColorWizardSplashLottie({ className }: ColorWizardSplashLottieProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={className} aria-hidden="true">
        <div className="mx-auto h-full w-full rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff6b57,#f7b24d,#42a7bf,#4363c9)] opacity-80 animate-pulse" />
      </div>
    )
  }

  return (
    <Lottie
      animationData={splashAnimation}
      loop
      autoplay
      className={className}
      aria-hidden="true"
    />
  )
}
