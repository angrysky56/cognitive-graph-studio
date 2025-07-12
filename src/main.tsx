/**
 * Main entry point for Cognitive Graph Studio
 * AI-powered knowledge graph visualization with Material UI
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

console.log('[main.tsx] Starting Cognitive Graph Studio...')
console.log('[main.tsx] React version:', React.version)

const rootElement = document.getElementById('root')
console.log('[main.tsx] Root element found:', !!rootElement)

if (rootElement) {
  console.log('[main.tsx] Creating React root...')

  try {
    const root = ReactDOM.createRoot(rootElement)
    console.log('[main.tsx] React root created successfully')

    console.log('[main.tsx] Rendering App with error boundary...')
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    )
    console.log('[main.tsx] App render completed')

  } catch (error) {
    console.error('[main.tsx] React setup error:', error)
    const errorObj = error as Error
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace; background: #fee; border: 2px solid red; margin: 20px;">
        <h2>React Setup Error:</h2>
        <p><strong>Message:</strong> ${errorObj.message}</p>
        <pre>${errorObj.stack || 'No stack trace'}</pre>
      </div>
    `
  }
} else {
  console.error('[main.tsx] CRITICAL: Root element not found!')
  document.body.innerHTML = '<h1 style="color: red;">CRITICAL ERROR: Root element not found!</h1>'
}
