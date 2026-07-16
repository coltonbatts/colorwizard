import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="system-page system-page--lost">
      <div className="system-page-grid" aria-hidden="true" />
      <div className="system-page-code" aria-hidden="true">404</div>
      <section className="system-page-panel">
        <span className="system-page-mark" aria-hidden="true" />
        <p className="system-page-kicker">Off spectrum</p>
        <h1>Nothing here.</h1>
        <Link
          href="/"
          className="system-page-action"
        >
          Return <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  )
}
