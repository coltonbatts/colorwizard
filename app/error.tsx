'use client'

/**
 * Root-level error boundary for the entire app
 * Catches unhandled client-side errors and provides recovery
 */

import { useEffect, useMemo } from 'react'

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            marginBottom: '16px',
            color: '#333',
          }}
        >
          ColorWizard encountered an error
        </h1>
        
        <p
          style={{
            fontSize: '16px',
            lineHeight: '1.5',
            color: '#666',
            marginBottom: '24px',
          }}
        >
          {chunkLoad ? (
            <>
              The app could not load one of its JavaScript bundles. This can happen after a new
              deploy, a desktop dev-server restart, or an interrupted local connection. Reloading
              usually fetches the current bundle set.
            </>
          ) : (
            <>We&apos;re sorry - something went wrong. This has been logged and we&apos;ll investigate.</>
          )}
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details
            style={{
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: '#f9f9f9',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px' }}>
              Error Details (Development Only)
            </summary>
            <pre
              style={{
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '12px',
                color: '#d32f2f',
              }}
            >
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={chunkLoad ? handleHardReload : reset}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: '#2196F3',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1976D2'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2196F3'
            }}
          >
            {chunkLoad ? 'Reload page' : 'Try Again'}
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/'
              }
            }}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e0e0e0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5'
            }}
          >
            Go Home
          </button>

          <button
            onClick={() => {
              // Clear localStorage to reset state
              try {
                if (typeof window !== 'undefined') {
                  window.localStorage.clear()
                  window.location.reload()
                }
              } catch {
                window.location.reload()
              }
            }}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#d32f2f',
              backgroundColor: '#ffebee',
              border: '1px solid #ef5350',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ffcdd2'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffebee'
            }}
          >
            Clear Data & Reload
          </button>
        </div>

        <p
          style={{
            marginTop: '24px',
            fontSize: '14px',
            color: '#999',
          }}
        >
          Error ID: {error.digest || 'unknown'}
        </p>
      </div>
    </div>
  )
}
