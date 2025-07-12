import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('[ErrorBoundary] Caught error:', error)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#fee',
          border: '2px solid red',
          margin: '20px',
          fontFamily: 'monospace'
        }}>
          <h2>Application Error</h2>
          <p><strong>Error:</strong> {this.state.error?.message}</p>
          <details>
            <summary>Stack Trace</summary>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {this.state.error?.stack || 'No stack trace available'}
            </pre>
          </details>
          {this.state.errorInfo && (
            <details>
              <summary>Component Stack</summary>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
