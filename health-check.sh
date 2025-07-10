#!/bin/bash

# Cognitive Graph Studio - Health Check Script
# Verifies system requirements and configuration

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_header() { echo -e "${PURPLE}$1${NC}"; }

# Health check results
ISSUES=0
WARNINGS=0

check_requirement() {
    local name="$1"
    local command="$2"
    local version_cmd="$3"
    local min_version="$4"
    
    if command -v "$command" &> /dev/null; then
        if [ -n "$version_cmd" ]; then
            version=$($version_cmd 2>/dev/null | head -1)
            log_success "$name: $version"
        else
            log_success "$name: installed"
        fi
    else
        log_error "$name: not found"
        ISSUES=$((ISSUES + 1))
    fi
}

log_header "🩺 Cognitive Graph Studio Health Check"
log_header "====================================="
echo ""

# Check basic requirements
log_header "📋 System Requirements"
check_requirement "Node.js" "node" "node --version" "18"
check_requirement "npm" "npm" "npm --version" "8"

# Check optional tools
if command -v uv &> /dev/null; then
    log_success "uv: $(uv --version)"
else
    log_info "uv: not installed (optional - faster package management)"
fi

echo ""

# Check project setup
log_header "📁 Project Setup"

if [ ! -f "package.json" ]; then
    log_error "package.json not found - run from project root"
    ISSUES=$((ISSUES + 1))
else
    log_success "package.json found"
fi

if [ ! -d "node_modules" ]; then
    log_warning "node_modules not found - run 'npm run setup'"
    WARNINGS=$((WARNINGS + 1))
else
    log_success "Dependencies installed"
fi

if [ ! -f ".env.local" ]; then
    log_warning ".env.local not found - run 'npm run setup'"
    WARNINGS=$((WARNINGS + 1))
else
    log_success "Configuration file exists"
fi

echo ""

# Check ports
log_header "🌐 Network Ports"

check_port() {
    local port=$1
    local service=$2
    
    if command -v lsof &> /dev/null; then
        if lsof -i :$port &> /dev/null; then
            log_warning "Port $port ($service) is in use"
            WARNINGS=$((WARNINGS + 1))
        else
            log_success "Port $port ($service) available"
        fi
    else
        log_info "Cannot check port $port (lsof not available)"
    fi
}

check_port 5173 "Development server"
check_port 4173 "Preview server"

echo ""

# Check AI services
log_header "🤖 AI Services"

ai_services=0

# Check Ollama
if command -v ollama &> /dev/null; then
    if curl -s http://localhost:11434/api/tags &> /dev/null; then
        log_success "Ollama: running"
        ai_services=$((ai_services + 1))
    else
        log_info "Ollama: installed but not running"
    fi
else
    log_info "Ollama: not installed"
fi

# Check LM Studio
if curl -s http://localhost:1234/v1/models &> /dev/null; then
    log_success "LM Studio: running"
    ai_services=$((ai_services + 1))
else
    log_info "LM Studio: not running"
fi

# Check API keys
if [ -f ".env.local" ]; then
    if grep -q "VITE_GEMINI_API_KEY=.*[^[:space:]]" .env.local; then
        log_success "Gemini API: configured"
        ai_services=$((ai_services + 1))
    else
        log_info "Gemini API: not configured"
    fi
    
    if grep -q "VITE_OPENAI_API_KEY=.*[^[:space:]]" .env.local; then
        log_success "OpenAI API: configured"
        ai_services=$((ai_services + 1))
    else
        log_info "OpenAI API: not configured"
    fi
fi

if [ $ai_services -eq 0 ]; then
    log_warning "No AI services available - AI features will be limited"
    WARNINGS=$((WARNINGS + 1))
else
    log_success "$ai_services AI service(s) available"
fi

echo ""

# Check system resources
log_header "💻 System Resources"

# Check memory
if command -v free &> /dev/null; then
    total_mem=$(free -m | awk 'NR==2{print $2}')
    available_mem=$(free -m | awk 'NR==2{print $7}')
    
    if [ $total_mem -gt 4096 ]; then
        log_success "RAM: ${total_mem}MB total, ${available_mem}MB available"
    elif [ $total_mem -gt 2048 ]; then
        log_warning "RAM: ${total_mem}MB total (4GB+ recommended)"
        WARNINGS=$((WARNINGS + 1))
    else
        log_error "RAM: ${total_mem}MB total (insufficient for optimal performance)"
        ISSUES=$((ISSUES + 1))
    fi
elif command -v vm_stat &> /dev/null; then
    # macOS
    log_info "RAM: check available (macOS system)"
else
    log_info "RAM: cannot check (platform not supported)"
fi

# Check disk space
if command -v df &> /dev/null; then
    available_space=$(df . | tail -1 | awk '{print $4}')
    available_gb=$((available_space / 1024 / 1024))
    
    if [ $available_gb -gt 2 ]; then
        log_success "Disk space: ${available_gb}GB available"
    else
        log_warning "Disk space: ${available_gb}GB available (low)"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

echo ""

# Final results
log_header "📊 Health Check Results"

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    log_success "All checks passed! Your system is ready."
    echo ""
    log_info "🚀 Start the application with: npm start"
    exit 0
elif [ $ISSUES -eq 0 ]; then
    log_warning "$WARNINGS warning(s) found - application should work but may have limitations"
    echo ""
    log_info "🚀 Start the application with: npm start"
    log_info "📝 Address warnings for optimal experience"
    exit 0
else
    log_error "$ISSUES critical issue(s) and $WARNINGS warning(s) found"
    echo ""
    log_info "🔧 Please resolve critical issues before starting"
    log_info "📖 See README.md for setup instructions"
    exit 1
fi