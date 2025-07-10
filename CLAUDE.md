# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cognitive Graph Studio is an AI-powered knowledge graph visualization tool built with React, TypeScript, and Material UI. It enables users to create, manipulate, and analyze knowledge graphs with integrated AI capabilities for content generation, semantic linking, and graph analysis.

## Development Commands

### Core Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Run tests
npm run test

# Generate TypeScript documentation
npm run docs
```

### Additional Commands
```bash
# Setup project dependencies
npm run setup

# Start with production optimization
npm run start:prod

# Health check all services
npm run health

# Clean build artifacts
npm run clean

# Build with bundle analysis
npm run build:analyze
```

### Testing Commands
```bash
# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Generate test coverage report
npm run test:coverage
```

## Project Architecture

### Core System Components

**GraphEngine (`src/core/GraphEngine.ts`)**
- Central orchestrator for all graph operations
- Manages AI services, vector search, and TreeQuest reasoning
- Handles node/edge creation, updates, and deletions with AI enhancement
- Provides semantic search and auto-discovery capabilities

**AI Agent System (`src/core/ai-agents.ts`)**
- Discovery Agent: Finds and creates new content from external sources
- Summarization Agent: Processes and summarizes node content
- Linking Agent: Discovers semantic relationships between nodes
- Agent Manager: Orchestrates multi-agent workflows

**AI Service (`src/services/ai-service.ts`)**
- Multi-LLM provider support (Gemini, OpenAI, Local Ollama, LM Studio)
- Unified interface for text generation and embeddings
- Provider-specific optimizations and fallback mechanisms

### Data Architecture

**Enhanced Graph Types (`src/types/graph.ts`)**
- `EnhancedGraphNode`: Rich content nodes with AI metadata
- `EnhancedGraphEdge`: Semantic relationships with discovery context
- `EnhancedGraphCluster`: AI-generated semantic groupings

**State Management**
- Zustand-based stores for graph state
- Real-time updates and event-driven architecture
- Persistent storage with automatic save/load

### UI Architecture

**Main App (`src/App.tsx`)**
- Three-panel layout: Node Editor (left), Graph Canvas (center), AI Panel (right)
- Tab-based interface for AI Assistant, Document Import, and Network Analysis
- Resizable panels with persistent layout

**Graph Canvas (`src/components/MyGraphCanvas.tsx`)**
- React Flow-based graph visualization
- Multiple layout algorithms (hierarchical, circular, grid, radial, tree, force)
- Custom node types (concept, source, idea) and edge types (semantic, hierarchical)
- Interactive node creation and editing

**AI Panel (`src/components/AIPanel.tsx`)**
- Graph-aware AI assistant with context understanding
- Quick actions for graph analysis and enhancement
- Suggestion system for new nodes and connections
- Real-time graph statistics and status

## Key Features

### AI-Powered Capabilities
- **Graph Analysis**: AI can read and analyze entire graph structure
- **Content Generation**: Automatic node summarization and key term extraction
- **Semantic Linking**: AI discovers relationships between nodes
- **Auto-Enhancement**: Continuous improvement of graph quality

### Graph Visualization
- **Interactive Canvas**: Click, drag, zoom, and edit nodes directly
- **Layout Algorithms**: Multiple automatic layout options
- **Visual Customization**: Node types, colors, and edge styles
- **Real-time Updates**: Live graph updates and statistics

### Document Processing
- **Smart Import**: Parse documents and create structured nodes
- **Semantic Analysis**: Extract key concepts and relationships
- **Multi-format Support**: Text, CSV, and structured data

## Configuration

### Environment Variables
```env
# AI Services
VITE_GEMINI_API_KEY=your_gemini_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_LMSTUDIO_BASE_URL=http://localhost:1234
VITE_OLLAMA_BASE_URL=http://localhost:11434

# Vector Search
VITE_VECTOR_DIMENSIONS=768
VITE_VECTOR_PERSISTENCE_ENABLED=true
```

### AI Configuration
The system supports multiple AI providers with automatic fallback:
- **Gemini**: Primary recommendation for best performance
- **OpenAI**: Alternative cloud provider
- **Local LM Studio**: Local inference server
- **Ollama**: Local model management

## Development Patterns

### Component Structure
- Components use TypeScript with strict typing
- Material UI for consistent design system
- Custom hooks for state management
- Separation of concerns with service layers

### State Management
- Zustand stores for global state
- Local component state for UI interactions
- Event-driven updates for real-time features

### Error Handling
- Comprehensive error boundaries
- Graceful degradation for AI service failures
- User-friendly error messages with recovery suggestions

## File Structure Overview

```
src/
├── components/          # React UI components
│   ├── nodes/          # Custom React Flow node types
│   ├── edges/          # Custom React Flow edge types
│   └── *.tsx           # Main UI components
├── core/               # Core business logic
│   ├── GraphEngine.ts  # Main graph orchestrator
│   └── ai-agents.ts    # AI agent system
├── services/           # External service integrations
│   ├── ai-service.ts   # Multi-LLM provider
│   └── *.ts           # Other service implementations
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and helpers
└── stores/            # State management stores
```

## Important Notes

### AI Service Integration
- All AI operations go through the unified AIService interface
- Provider switching is handled automatically with fallback
- Rate limiting and error handling are built-in

### Graph Operations
- All graph modifications trigger AI enhancement if enabled
- Vector embeddings are generated automatically for semantic search
- Graph state is persisted locally with automatic save/load

### Performance Considerations
- Large graphs (>1000 nodes) may require layout optimization
- AI operations are queued to prevent overwhelming services
- Vector search uses approximate algorithms for speed

## Testing

The project uses Vitest for testing with coverage reporting. Key test areas:
- Graph engine operations
- AI service provider integration
- Component rendering and interaction
- State management and updates

Run tests with `npm run test` and generate coverage with `npm run test:coverage`.