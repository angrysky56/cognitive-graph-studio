/**
 * Main entry point for Cognitive Graph Studio - Fixed Version
 * Integrates enhanced components with proper error boundaries and performance monitoring
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import AppFixed from './AppFixed'

// Initialize the React application with enhanced error handling
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)

root.render(
  <React.StrictMode>
    <AppFixed />
  </React.StrictMode>
)
