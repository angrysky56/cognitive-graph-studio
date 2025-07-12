/**
 * Test App Component - Minimal test for debugging
 */

import React from 'react'

const TestApp: React.FC = () => {
  console.log('[TestApp] Rendering test app...')

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#2d3748' }}>Test App - React is Working!</h1>
      <p>If you can see this, React is mounting correctly.</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  )
}

export default TestApp
