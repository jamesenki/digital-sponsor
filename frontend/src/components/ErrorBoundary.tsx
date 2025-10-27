import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  onError?: (error: string) => void
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors and provides graceful fallback
 * Ensures app doesn't crash completely and maintains crisis button access
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Report to parent component
    if (this.props.onError) {
      this.props.onError(error.message)
    }

    // Log for debugging (no personal data)
    console.log('Error boundary triggered:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" data-testid="error-boundary">
          <div className="error-content">
            <h2>🚨 Something went wrong</h2>
            <p>
              We're sorry, but something unexpected happened. 
              The app is designed to work offline, so please try refreshing the page.
            </p>
            <details className="error-details">
              <summary>Technical Details (for developers)</summary>
              <pre>{this.state.error?.message}</pre>
            </details>
            <button 
              onClick={() => window.location.reload()}
              className="retry-button"
            >
              Refresh Page
            </button>
            <p className="crisis-notice">
              🆘 <strong>If you're in crisis:</strong> The crisis support button should still work, 
              or call 988 for immediate help.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}