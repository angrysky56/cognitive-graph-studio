#!/bin/bash

# Cognitive Graph Studio - Enhanced Setup Script
# Comprehensive installation and configuration with error recovery

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${PURPLE}$1${NC}"
}

# Cleanup function for errors
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "Setup failed. Run with --verbose for more details."
        exit 1
    fi
}

trap cleanup EXIT

# Parse command line arguments
VERBOSE=false
SKIP_BUILD=false
FORCE_REINSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --force-reinstall)
            FORCE_REINSTALL=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --verbose, -v      Enable verbose output"
            echo "  --skip-build       Skip the build verification step"
            echo "  --force-reinstall  Force reinstall all dependencies"
            echo "  --help, -h         Show this help message"
            exit 0
            ;;
        *)
            log_warning "Unknown option: $1"
            shift
            ;;
    esac
done

# Set verbose output
if [ "$VERBOSE" = true ]; then
    set -x
fi

log_header "🧠 Cognitive Graph Studio Setup"
log_header "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "package.json not found. Please run this script from the project root."
    exit 1
fi

log_info "Detected project: $(grep -o '"name": "[^"]*"' package.json | cut -d'"' -f4)"

# System requirements check
log_header "📋 System Requirements Check"

# Check for Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js 18+ first."
    log_info "Download from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js version 18+ required. Current version: $(node -v)"
    log_info "Please upgrade Node.js from: https://nodejs.org/"
    exit 1
fi

log_success "Node.js $(node -v) ✓"

# Check for npm
if ! command -v npm &> /dev/null; then
    log_error "npm not found. Please install npm first."
    exit 1
fi

NPM_VERSION=$(npm -v)
log_success "npm $NPM_VERSION ✓"

# Check available disk space
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -lt 1000000 ]; then  # Less than ~1GB
    log_warning "Low disk space detected. At least 1GB recommended."
fi

# Check for uv (preferred package manager)
if command -v uv &> /dev/null; then
    UV_VERSION=$(uv --version | cut -d' ' -f2)
    log_success "uv $UV_VERSION detected (recommended) ✓"
    PACKAGE_MANAGER="uv"
else
    log_info "uv not found, using npm (consider installing uv for faster builds)"
    PACKAGE_MANAGER="npm"
fi

echo ""

# Dependency installation
log_header "📦 Dependency Management"

if [ "$FORCE_REINSTALL" = true ]; then
    log_info "Force reinstall requested, removing node_modules..."
    rm -rf node_modules package-lock.json
fi

if [ ! -d "node_modules" ] || [ "$FORCE_REINSTALL" = true ]; then
    log_info "Installing dependencies with $PACKAGE_MANAGER..."
    
    if [ "$PACKAGE_MANAGER" = "uv" ]; then
        uv pip install -e .
    else
        npm install
    fi
    
    if [ $? -ne 0 ]; then
        log_error "Failed to install dependencies"
        log_info "Try running with --force-reinstall or check your internet connection"
        exit 1
    fi
    
    log_success "Dependencies installed successfully"
else
    log_info "Dependencies already installed, skipping..."
fi

echo ""

# Environment configuration
log_header "⚙️  Environment Configuration"

if [ ! -f ".env.local" ]; then
    log_info "Creating .env.local configuration file..."
    cat > .env.local << 'EOF'
# Cognitive Graph Studio Configuration
# Edit this file to customize your installation

# ===========================================
# AI Services Configuration (Optional)
# ===========================================

# Gemini API (Google AI)
# Get your API key from: https://makersuite.google.com/app/apikey
VITE_GEMINI_API_KEY=

# OpenAI API (Optional)
# Get your API key from: https://platform.openai.com/api-keys
VITE_OPENAI_API_KEY=

# ===========================================
# Local AI Services (No API keys required)
# ===========================================

# LM Studio (Local AI server)
# Download from: https://lmstudio.ai/
VITE_LMSTUDIO_BASE_URL=http://localhost:1234
VITE_LMSTUDIO_MODEL=local-model

# Ollama (Local AI server)
# Install from: https://ollama.ai/
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.2:3b

# ===========================================
# Vector Database Configuration
# ===========================================

VITE_VECTOR_DIMENSIONS=768
VITE_VECTOR_MAX_VECTORS=10000
VITE_VECTOR_PERSISTENCE_ENABLED=true
VITE_VECTOR_PERSISTENCE_PATH=./data/vectors

# ===========================================
# TreeQuest Configuration (Graph Search)
# ===========================================

VITE_TREEQUEST_ALGORITHM=abmcts-a
VITE_TREEQUEST_MAX_SIMULATIONS=100
VITE_TREEQUEST_TIME_LIMIT=30
VITE_TREEQUEST_EXPLORATION_CONSTANT=1.414

# ===========================================
# Application Settings
# ===========================================

VITE_APP_VERSION=0.1.0
VITE_APP_NAME=Cognitive Graph Studio
VITE_APP_THEME=dark
VITE_DEBUG_MODE=false

# ===========================================
# Development Settings
# ===========================================

# Set to 'true' to enable development features
VITE_DEV_MODE=true
VITE_SHOW_DEBUG_PANELS=false
VITE_ENABLE_PERFORMANCE_MONITORING=false
EOF
    log_success "Created .env.local configuration file"
    log_info "📝 Edit .env.local to add your API keys for AI features"
else
    log_info ".env.local already exists, skipping creation"
    
    # Check if the env file has the new variables
    if ! grep -q "VITE_VECTOR_DIMENSIONS" .env.local; then
        log_info "Updating .env.local with new configuration options..."
        cat >> .env.local << 'EOF'

# ===========================================
# Vector Database Configuration (Added)
# ===========================================

VITE_VECTOR_DIMENSIONS=768
VITE_VECTOR_MAX_VECTORS=10000
VITE_VECTOR_PERSISTENCE_ENABLED=true
VITE_VECTOR_PERSISTENCE_PATH=./data/vectors

# ===========================================
# TreeQuest Configuration (Added)
# ===========================================

VITE_TREEQUEST_ALGORITHM=abmcts-a
VITE_TREEQUEST_MAX_SIMULATIONS=100
VITE_TREEQUEST_TIME_LIMIT=30
VITE_TREEQUEST_EXPLORATION_CONSTANT=1.414
EOF
        log_success "Updated .env.local with new configuration options"
    fi
fi

echo ""

# Directory structure
log_header "📁 Directory Structure"

DIRECTORIES=(
    "data/graphs"
    "data/exports" 
    "data/vectors"
    "data/imports"
    "logs"
)

for dir in "${DIRECTORIES[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        log_success "Created $dir/"
    else
        log_info "$dir/ already exists"
    fi
done

# Create .gitkeep files for empty directories
for dir in "${DIRECTORIES[@]}"; do
    if [ ! -f "$dir/.gitkeep" ]; then
        touch "$dir/.gitkeep"
    fi
done

echo ""

# Configuration files
log_header "🔧 Configuration Files"

# Enhanced TypeScript config for Node.js
if [ ! -f "tsconfig.node.json" ]; then
    log_info "Creating tsconfig.node.json..."
    cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "target": "ES2022",
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts", "electron/**/*", "scripts/**/*"]
}
EOF
    log_success "Created tsconfig.node.json"
fi

# Enhanced .gitignore
if [ ! -f ".gitignore" ]; then
    log_info "Creating comprehensive .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Build outputs
dist/
dist-electron/
build/
.next/
out/

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
*.sublime-*

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# User data (graphs, exports, etc.)
data/graphs/*.json
data/exports/*
data/vectors/*
data/imports/*
!data/**/.gitkeep

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Temporary files
*.tmp
*.temp
.cache/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/
EOF
    log_success "Created comprehensive .gitignore"
fi

echo ""

# Build verification (optional)
if [ "$SKIP_BUILD" = false ]; then
    log_header "🔨 Build Verification"
    log_info "Building project to verify setup..."
    
    if [ "$PACKAGE_MANAGER" = "uv" ]; then
        npm run build  # uv doesn't handle npm scripts
    else
        npm run build
    fi
    
    if [ $? -ne 0 ]; then
        log_error "Build failed. Check the error messages above."
        log_info "Try running setup again with --verbose for more details"
        exit 1
    fi
    
    log_success "Build verification passed"
else
    log_info "Skipping build verification (--skip-build flag provided)"
fi

echo ""

# Final instructions
log_header "🎉 Setup Completed Successfully!"
log_header "=================================="
echo ""

log_info "Your Cognitive Graph Studio is ready to use!"
echo ""

log_header "🚀 Quick Start Commands:"
echo "  ./start.sh              # Start development server"
echo "  ./start.sh --prod       # Start production build"
echo "  npm run dev             # Alternative development start"
echo "  npm run build           # Build for production"
echo ""

log_header "🔗 URLs:"
echo "  Development: http://localhost:5173"
echo "  Network:     http://$(hostname -I | awk '{print $1}'):5173"
echo ""

log_header "⚙️  Configuration:"
echo "  📝 Edit .env.local for API keys and settings"
echo "  📁 Data stored in: ./data/"
echo "  📋 Logs stored in: ./logs/"
echo ""

log_header "🤖 AI Features Setup (Optional):"
echo "  • Gemini API: Add VITE_GEMINI_API_KEY to .env.local"
echo "  • LM Studio: Download from https://lmstudio.ai/ and run on port 1234"
echo "  • Ollama: Install from https://ollama.ai/ and run 'ollama pull llama3.2:3b'"
echo ""

log_header "📖 Documentation:"
echo "  • README.md - Comprehensive usage guide"
echo "  • issues_and_improvements.md - Known issues and roadmap"
echo "  • src/types/ - TypeScript type definitions"
echo ""

log_header "🐛 Troubleshooting:"
echo "  • Run './setup.sh --verbose' for detailed logs"
echo "  • Check logs/ directory for error details"
echo "  • Report issues at the project repository"
echo ""

log_success "Happy knowledge graphing! 🧠✨"

# Remove the trap since we completed successfully
trap - EXIT