'use client'

/**
 * ErrorBoundary - Reusable error boundary component for graceful error handling.
 * Must be a class component per React requirements.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface FallbackRenderProps {
    error: Error
    resetError: () => void
}

interface ErrorBoundaryProps {
    children: ReactNode
    /** Custom fallback UI - can be a ReactNode or a render function */
    fallback?: ReactNode | ((props: FallbackRenderProps) => ReactNode)
    /** Optional callback for error logging/telemetry */
    onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.group('🚨 ErrorBoundary caught an error')
            console.error('Error:', error)
            console.error('Component Stack:', errorInfo.componentStack)
            console.groupEnd()
        }

        // Call optional onError callback (async, fire-and-forget)
        if (this.props.onError) {
            try {
                this.props.onError(error, errorInfo)
            } catch {
                // Swallow errors in error handler to prevent cascading failures
            }
        }
    }

    resetError = (): void => {
        this.setState({ hasError: false, error: null })
    }

    render(): ReactNode {
        if (this.state.hasError && this.state.error) {
            const { fallback } = this.props

            // If fallback is a function, call it with error and reset
            if (typeof fallback === 'function') {
                return fallback({
                    error: this.state.error,
                    resetError: this.resetError,
                })
            }

            // If fallback is a ReactNode, render it
            if (fallback) {
                return fallback
            }

            // Default fallback
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-studio mb-2">Something went wrong</h3>
                    <p className="text-sm text-studio-muted mb-4">
                        An unexpected error occurred
                    </p>
                    <button
                        onClick={this.resetError}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
