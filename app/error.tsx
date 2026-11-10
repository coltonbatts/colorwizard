'use client'

/**
 * Root-level error boundary for the entire app
 * Catches unhandled client-side errors and provides recovery
 */

import { useEffect, useMemo, useState } from 'react'

type AppError = Error & { digest?: string }

function isChunkLoadFailure(error: AppError): boolean {
  const name = typeof error.name === 'string' ? error.name : ''
  const msg = typeof error.message === 'string' ? error.message : ''
  return (
    name === 'ChunkLoadError' ||
    /loading chunk/i.test(msg) ||
    /chunkloaderror/i.test(name) ||
    /failed to fetch dynamically imported module/i.test(msg) ||
    /importing a module script failed/i.test(msg)
  )
}

function getErrorLogPayload(error: AppError) {
  const name = typeof error.name === 'string' ? error.name : 'Error'
  const message =
    typeof error.message === 'string' && error.message.length > 0
      ? error.message
      : '[empty message]'
  return {
    name,
    message,
    stack: typeof error.stack === 'string' ? error.stack : undefined,
    digest: error.digest,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    timestamp: new Date().toISOString(),
  }
}

export default function Error({
  error,
  reset,
}: {
  error: AppError
  reset: () => void
}) {
  const chunkLoad = useMemo(() => isChunkLoadFailure(error), [error])
  // Clearing storage erases the saved color library, so it takes a second, deliberate press.
  const [confirmingClear, setConfirmingClear] = useState(false)

  useEffect(() => {
    const payload = getErrorLogPayload(error)
    // Separate args so DevTools never shows a collapsed `{}` for empty/non-enumerable cases
    console.error(
      'App-level error caught:',
      payload.name,
      payload.message,
      payload.digest != null ? `(digest: ${payload.digest})` : '',
      payload.timestamp,
      payload.userAgent,
      '\n',
      payload.stack ?? '(no stack)',
    )
  }, [error])

  const handleHardReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <main className="system-page system-page--error">
      <div className="system-page-grid" aria-hidden="true" />
      <div className="system-page-code" aria-hidden="true">ERR</div>
      <section className="system-page-panel">
        <span className="system-page-mark" aria-hidden="true" />
        <p className="system-page-kicker">Signal interrupted</p>
        <h1>{chunkLoad ? 'Reload the instrument.' : 'The signal broke.'}</h1>

        {process.env.NODE_ENV === 'development' && (
          <details className="system-page-details">
            <summary>Diagnostics</summary>
            <pre>
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="system-page-actions">
          <button
            onClick={chunkLoad ? handleHardReload : reset}
            className="system-page-action"
          >
            {chunkLoad ? 'Reload' : 'Retry'} <span aria-hidden="true">↗</span>
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/'
              }
            }}
            className="system-page-action system-page-action--quiet"
          >
            Home
          </button>

          {!confirmingClear && (
            <button
              onClick={() => setConfirmingClear(true)}
              className="system-page-action system-page-action--danger"
            >
              Clear data…
            </button>
          )}
        </div>

        {confirmingClear && (
          <div className="system-page-confirm" role="alertdialog" aria-labelledby="clear-data-title" aria-describedby="clear-data-detail">
            <p id="clear-data-title" className="system-page-confirm-title">Erase everything ColorWizard has saved here?</p>
            <p id="clear-data-detail">
              Saved colors, notes, collections, palettes and settings will be gone for good.
              Backup files you have downloaded are not affected. Try {chunkLoad ? 'Reload' : 'Retry'} first.
            </p>
            <div className="system-page-actions">
              <button autoFocus onClick={() => setConfirmingClear(false)} className="system-page-action system-page-action--quiet">
                Keep my data
              </button>
              <button
                onClick={() => {
                  try {
                    window.localStorage.clear()
                  } catch {
                    /* storage is blocked; reloading is all that is left */
                  }
                  window.location.reload()
                }}
                className="system-page-action system-page-action--danger"
              >
                Erase everything
              </button>
            </div>
          </div>
        )}

        <p className="system-page-id">ID / {error.digest || 'unknown'}</p>
      </section>
    </main>
  )
}
