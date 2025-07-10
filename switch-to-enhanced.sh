#!/bin/bash

# Switch to Enhanced Cognitive Graph Studio
# This script updates the main entry point to use the enhanced version

echo "🚀 Switching to Enhanced Cognitive Graph Studio..."

# Backup original main.tsx
cp src/main.tsx src/main.tsx.backup

# Update main.tsx to use EnhancedApp
cat > src/main.tsx << 'EOF'
/**
 * Main entry point for Enhanced Cognitive Graph Studio
 * Featuring graph-aware AI, semantic document processing, and network analysis
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import EnhancedApp from './EnhancedApp'

// Initialize the enhanced React application
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)

root.render(
  <React.StrictMode>
    <EnhancedApp />
  </React.StrictMode>
)
EOF

echo "✅ Enhanced version activated!"
echo ""
echo "🎯 New Features:"
echo "  • AI can now read and understand your graph"
echo "  • Semantic document processing (no more 'brain inspired 1')"
echo "  • Network analysis with graph metrics"
echo "  • Intelligent connection suggestions"
echo "  • Enhanced AI interaction panel"
echo ""
echo "📖 Quick Start:"
echo "  1. npm run dev"
echo "  2. Upload the demo-document.md file"
echo "  3. Ask AI: 'Analyze my current graph'"
echo "  4. Check the Analysis tab for network metrics"
echo ""
echo "🔄 To revert: cp src/main.tsx.backup src/main.tsx"
