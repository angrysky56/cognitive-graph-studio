#!/bin/bash

# Cognitive Graph Studio - Start Script
# Intelligent startup with multiple modes and health checking

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

log_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

# Default values
MODE="development"
PORT="5173"
HOST="localhost"
OPEN_BROWSER=true
CHECK_DEPS=true
SHOW_LOGS=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --prod|--production)
            MODE="production"
            PORT="4173"
            shift
            ;;
        --dev|--development)
            MODE="development"
            PORT="5173"
            shift
            ;;
        --port|-p)
            PORT="$2"
            shift 2
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        --no-open)
            OPEN_BROWSER=false
            shift
            ;;
        --no-deps-check)
            CHECK_DEPS=false
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Cognitive Graph Studio - Start Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Modes:"
            echo "  --dev, --development   Start development server (default)"
            echo "  --prod, --production   Start production server"
            echo ""
            echo "Options:"
            echo "  --port, -p PORT        Set port number (default: 5173 for dev, 4173 for prod)"
            echo "  --host HOST            Set host address (default: localhost)"
            echo "  --no-open              Don't automatically open browser"
            echo "  --no-deps-check        Skip dependency verification"
            echo "  --logs                 Show application logs"
            echo "  --verbose, -v          Enable verbose output"
            echo "  --help, -h             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                     # Start development server"
            echo "  $0 --prod              # Start production server"
            echo "  $0 --port 8080         # Start on custom port"
            echo "  $0 --host 0.0.0.0      # Listen on all interfaces"
            echo "  $0 --logs --verbose    # Start with detailed logging"
            echo ""
            exit 0
            ;;
        *)
            log_warning "Unknown option: $1"
            log_info "Use --help for usage information"
            shift
            ;;
    esac
done

# Set verbose output
if [ "$VERBOSE" = true ]; then
    set -x
fi

# Header
log_header "🧠 Cognitive Graph Studio"
log_header "========================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "package.json not found. Please run this script from the project root."
    exit 1
fi

PROJECT_NAME=$(grep -o '"name": "[^"]*"' package.json | cut -d'"' -f4)
PROJECT_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)

log_info "Project: $PROJECT_NAME v$PROJECT_VERSION"
log_info "Mode: $MODE"
log_info "Port: $PORT"
log_info "Host: $HOST"
echo ""

# Pre-flight checks
log_header "🔍 Pre-flight Checks"

# Check if setup was run
if [ ! -f ".env.local" ]; then
    log_warning "Configuration file .env.local not found"
    log_info "Running setup script first..."
    echo ""
    
    if [ -f "setup.sh" ]; then
        chmod +x setup.sh
        ./setup.sh
        echo ""
        log_success "Setup completed"
    else
        log_error "Setup script not found. Please run 'npm install' manually."
        exit 1
    fi
fi

# Check dependencies
if [ "$CHECK_DEPS" = true ]; then
    if [ ! -d "node_modules" ]; then
        log_warning "Dependencies not installed"
        log_step "Installing dependencies..."
        npm install
        
        if [ $? -ne 0 ]; then
            log_error "Failed to install dependencies"
            exit 1
        fi
        
        log_success "Dependencies installed"
    else
        log_success "Dependencies verified"
    fi
else
    log_info "Skipping dependency check"
fi

# Check for port conflicts
if command -v lsof &> /dev/null; then
    if lsof -i :$PORT &> /dev/null; then
        log_warning "Port $PORT is already in use"
        
        # Try to find an alternative port
        for port in $(seq $((PORT + 1)) $((PORT + 10))); do
            if ! lsof -i :$port &> /dev/null; then
                log_info "Using alternative port: $port"
                PORT=$port
                break
            fi
        done
        
        if lsof -i :$PORT &> /dev/null; then
            log_error "No available ports found in range $PORT-$((PORT + 10))"
            log_info "Please stop other services or use --port to specify a different port"
            exit 1
        fi
    fi
fi

log_success "Port $PORT is available"

# Check system resources
if command -v free &> /dev/null; then
    AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.1f", $7/1024}')
    if (( $(echo "$AVAILABLE_MEM < 0.5" | bc -l) )); then
        log_warning "Low memory detected (${AVAILABLE_MEM}GB available)"
        log_info "Consider closing other applications for better performance"
    fi
fi

# Check AI services status (optional)
log_header "🤖 AI Services Status"

AI_SERVICES_AVAILABLE=0

# Check Ollama
if command -v ollama &> /dev/null; then
    if curl -s http://localhost:11434/api/tags &> /dev/null; then
        log_success "Ollama service detected"
        AI_SERVICES_AVAILABLE=$((AI_SERVICES_AVAILABLE + 1))
    else
        log_info "Ollama installed but not running"
    fi
else
    log_info "Ollama not installed"
fi

# Check LM Studio
if curl -s http://localhost:1234/v1/models &> /dev/null; then
    log_success "LM Studio service detected"
    AI_SERVICES_AVAILABLE=$((AI_SERVICES_AVAILABLE + 1))
else
    log_info "LM Studio not running"
fi

# Check API keys
if [ -f ".env.local" ]; then
    if grep -q "VITE_GEMINI_API_KEY=.*[^[:space:]]" .env.local; then
        log_success "Gemini API key configured"
        AI_SERVICES_AVAILABLE=$((AI_SERVICES_AVAILABLE + 1))
    else
        log_info "Gemini API key not configured"
    fi
    
    if grep -q "VITE_OPENAI_API_KEY=.*[^[:space:]]" .env.local; then
        log_success "OpenAI API key configured"
        AI_SERVICES_AVAILABLE=$((AI_SERVICES_AVAILABLE + 1))
    else
        log_info "OpenAI API key not configured"
    fi
fi

if [ $AI_SERVICES_AVAILABLE -eq 0 ]; then
    log_warning "No AI services detected"
    log_info "The app will work but AI features will be limited"
    log_info "See README.md for AI service setup instructions"
else
    log_success "$AI_SERVICES_AVAILABLE AI service(s) available"
fi

echo ""

# Create log directory if needed
if [ "$SHOW_LOGS" = true ]; then
    mkdir -p logs
    LOG_FILE="logs/app-$(date +%Y%m%d-%H%M%S).log"
    log_info "Logs will be saved to: $LOG_FILE"
fi

# Build for production mode
if [ "$MODE" = "production" ]; then
    log_header "🔨 Production Build"
    
    if [ ! -d "dist" ] || [ "$VERBOSE" = true ]; then
        log_step "Building for production..."
        npm run build
        
        if [ $? -ne 0 ]; then
            log_error "Production build failed"
            exit 1
        fi
        
        log_success "Production build completed"
    else
        log_info "Using existing production build"
        log_info "Run 'npm run build' to rebuild if needed"
    fi
    echo ""
fi

# Prepare startup
log_header "🚀 Starting Application"

# Determine the correct start command
if [ "$MODE" = "production" ]; then
    START_CMD="npm run preview -- --port $PORT --host $HOST"
    URL="http://$HOST:$PORT"
else
    START_CMD="npm run dev -- --port $PORT --host $HOST"
    URL="http://$HOST:$PORT"
fi

log_info "Command: $START_CMD"
log_info "URL: $URL"

# Open browser automatically
if [ "$OPEN_BROWSER" = true ] && command -v xdg-open &> /dev/null; then
    log_info "Browser will open automatically"
    
    # Delay browser opening to ensure server starts
    (sleep 3 && xdg-open "$URL") &
elif [ "$OPEN_BROWSER" = true ] && command -v open &> /dev/null; then
    log_info "Browser will open automatically"
    
    # Delay browser opening to ensure server starts (macOS)
    (sleep 3 && open "$URL") &
elif [ "$OPEN_BROWSER" = true ]; then
    log_info "Auto-open not supported on this system"
    log_info "Manually open: $URL"
fi

echo ""
log_header "📊 Application Information"
echo "  📍 Project: $PROJECT_NAME v$PROJECT_VERSION"
echo "  🌐 URL: $URL"
echo "  📁 Data: ./data/"
echo "  📋 Config: .env.local"
if [ "$SHOW_LOGS" = true ]; then
echo "  📝 Logs: $LOG_FILE"
fi
echo "  🛑 Stop: Press Ctrl+C"
echo ""

log_success "Starting $MODE server..."
echo ""
log_info "🎯 Access your Cognitive Graph Studio at: $URL"
echo ""

# Start the application
if [ "$SHOW_LOGS" = true ]; then
    # Start with logging
    $START_CMD 2>&1 | tee "$LOG_FILE"
else
    # Start normally
    exec $START_CMD
fi