import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12 text-ink">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">404</p>
        <h1 className="mt-4 font-display text-4xl tracking-tight">Page not found</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-secondary">
          This page does not exist in ColorWizard.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-signal px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-signal-hover"
        >
          Return home
        </Link>
      </div>
    </main>
  )
}
