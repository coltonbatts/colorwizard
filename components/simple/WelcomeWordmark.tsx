'use client'

import { useEffect, useRef } from 'react'
import styles from './simple.module.css'

/**
 * The animated ColorWizard wordmark on the web welcome page: solid 3D letter blocks placed on paper,
 * stop motion, shot overhead. Made in Remotion (source: output/shotcraft-test/src/StopMotionVHS.tsx),
 * encoded as AV1 WebM with an H.264 MP4 fallback, muted, no sound.
 *
 * It plays once and holds on its last frame. The poster is that same last frame, so a browser that
 * refuses autoplay, a slow connection, or prefers-reduced-motion all show the finished wordmark.
 * Decorative: the page's <h1> carries the name for screen readers.
 */
export function WelcomeWordmark() {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    video.muted = true
    video.play().catch(() => {
      // Autoplay refused: the poster (the finished wordmark) stays up.
    })
  }, [])

  return (
    <video
      ref={ref}
      className={styles.welcomeWordmark}
      width={1536}
      height={512}
      poster="/videos/welcome-wordmark-poster.webp"
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src="/videos/welcome-wordmark.webm" type='video/webm; codecs="av01.0.05M.08"' />
      <source src="/videos/welcome-wordmark.mp4" type="video/mp4" />
    </video>
  )
}
