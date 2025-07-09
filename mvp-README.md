# Cognitive Graph Studio

AI-powered knowledge graph visualization with Material UI dark theme, integrated with free AI services (Gemini, LM Studio, Ollama).

## Core Problem (Why?)
Enable visual knowledge exploration and organization with AI assistance, accessible to users without expensive AI services. This empowers individual researchers, students, and knowledge workers with a self-contained tool for building and navigating complex information networks.

## Primary Value Proposition  
A reliable, local desktop application for visual knowledge mapping with AI-powered content generation, using only free services. Operates entirely offline for core functionality with optional AI enhancement.

## Features (What?)

### Core Features
- **Interactive Graph Visualization**: Node-link diagrams with clustering and semantic organization
- **AI-Powered Content Generation**: Expand ideas using Gemini API, LM Studio, or Ollama
- **Node Management**: Create, edit, connect, and organize knowledge nodes
- **TreeQuest Integration**: AB-MCTS algorithms for intelligent knowledge exploration  
- **Material UI Dark Theme**: Modern, accessible interface optimized for extended use
- **Local Storage**: All data stored locally with optional export/import

### Non-Core (Out-of-Scope)
- Cloud synchronization or storage
- User accounts or authentication  
- Complex plugin systems
- Network-based collaboration
- Advanced analytics or telemetry

## Technical Architecture (How?)

### Technology Stack
- **Runtime**: Node.js with Electron for desktop deployment
- **Language**: TypeScript for type safety and maintainability
- **UI Framework**: React 18 with Material UI 5
- **Visualization**: D3.js for graph rendering and interaction
- **State Management**: Zustand for predictable state updates
- **Build Tools**: Vite for fast development and optimized builds
- **AI Integration**: Gemini API, LM Studio API, Ollama API

### Architecture Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │    │   Main Process   │    │   AI Services   │
│   (Material UI) │◄──►│   (Node.js)      │◄──►│   (Gemini/etc)  │
│   Graph Viz     │    │   File System    │    │   Local APIs    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Installation

### Prerequisites
- Node.js 18+ and npm
- (Optional) LM Studio or Ollama for local AI
- Gemini API key for cloud AI

### Setup
```bash
cd /home/ty/Repositories/ai_workspace/cognitive-graph-studio
npm install
npm run dev
```

### Building
```bash
npm run build          # Web build
npm run electron-build # Desktop app
```

## Usage

1. **Create Nodes**: Click anywhere to create knowledge nodes
2. **AI Expansion**: Use "Explore" to generate related concepts  
3. **Connect Ideas**: Link related nodes to build knowledge networks
4. **Cluster Analysis**: Automatic grouping of semantically related content
5. **Export**: Save graphs as JSON for backup or sharing

## Development

This project follows the AI-Guided MVP Protocol for local PC deployment, emphasizing:
- Type safety with TypeScript
- Modern React patterns with hooks
- Material Design principles
- Performance optimization
- Cross-platform compatibility

## License
MIT License - See LICENSE file for details

## Contributing
Issues and pull requests welcome. Please follow TypeScript and Material UI conventions.
