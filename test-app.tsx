/**
 * Test App - Minimal version to isolate loading issues
 */

import React from 'react'

const TestApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', color: 'white', backgroundColor: '#0a0a0f' }}>
      <h1>Test App Loading</h1>
      <p>If you see this, React is working.</p>
    </div>
  )
}

export default TestApp
