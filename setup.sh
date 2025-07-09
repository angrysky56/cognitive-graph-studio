#!/bin/bash

# Cognitive Graph Studio - Setup Script
# Automated installation and configuration

set -e

echo "🧠 Setting up Cognitive Graph Studio..."
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check for required tools
echo "📋 Checking prerequisites..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) found"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create environment configuration
echo ""
echo "⚙️  Setting up configuration..."

if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
# Cognitive Graph Studio Configuration
# Copy this file to .env.local and fill in your API keys

# Gemini API Configuration (Optional - for AI features)
VITE_GEMINI_API_KEY=

# LM Studio Configuration (Local AI)
VITE_LMSTUDIO_BASE_URL=http://localhost:1234
VITE_LMSTUDIO_MODEL=local-model

# Ollama Configuration (Local AI)  
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.2:3b

# App Configuration
VITE_APP_VERSION=0.1.0
VITE_APP_NAME=Cognitive Graph Studio
EOF
    echo "✅ Created .env.local template"
else
    echo "ℹ️  .env.local already exists"
fi

# Create data directory
mkdir -p data/graphs
mkdir -p data/exports
echo "✅ Created data directories"

# TypeScript configuration for Node.js
if [ ! -f "tsconfig.node.json" ]; then
    cat > tsconfig.node.json << EOF
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "electron/**/*"]
}
EOF
    echo "✅ Created tsconfig.node.json"
fi

# Git configuration
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
dist-electron/
build/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Data files (user content)
data/graphs/*.json
data/exports/*

# Logs
logs/
*.log

# Temporary files
*.tmp
*.temp
EOF
    echo "✅ Created .gitignore"
fi

# Build the project to verify everything works
echo ""
echo "🔨 Building project to verify setup..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

echo "✅ Build successful"

# Instructions for the user
echo ""
echo "🎉 Setup completed successfully!"
echo "==========================================="
echo ""
echo "Next steps:"
echo "1. 📝 Edit .env.local to add your API keys (optional for AI features)"
echo "2. 🚀 Start development server: npm run dev"
echo "3. 🌐 Open http://localhost:5173 in your browser"
echo ""
echo "Optional AI Setup:"
echo "• For Gemini API: Add your key to VITE_GEMINI_API_KEY in .env.local"
echo "• For LM Studio: Install and run LM Studio on port 1234"
echo "• For Ollama: Install Ollama and run 'ollama pull llama3.2:3b'"
echo ""
echo "📖 Documentation: See README.md for detailed usage instructions"
echo "🐛 Issues: Report bugs at the project repository"
echo ""
echo "Happy knowledge graphing! 🧠✨"
