# 🧠 Cognitive Graph Studio - AI Integration Guide

## AI Services Configuration

### 1. Google Gemini API (Free Tier)

**Why Gemini?** Free tier with generous limits, excellent for knowledge work.

1. **Get API Key:**
   ```bash
   # Visit: https://aistudio.google.com/app/apikey
   # Create a new API key
   ```

2. **Configure:**
   ```bash
   # Edit .env.local
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

3. **Models Available:**
   - `gemini-1.5-flash-8b` (Fast, efficient)
   - `gemini-1.5-pro` (Higher quality)

### 2. LM Studio (Local AI)

**Why LM Studio?** Completely free, runs locally, privacy-focused.

1. **Install:**
   ```bash
   # Download from https://lmstudio.ai/
   # Install and launch LM Studio
   ```

2. **Setup:**
   - Download a model (recommended: Llama 3.2 3B)
   - Start local server on port 1234
   - Configure in .env.local:
   ```bash
   VITE_LMSTUDIO_BASE_URL=http://localhost:1234
   VITE_LMSTUDIO_MODEL=your-model-name
   ```

### 3. Ollama (Local AI)

**Why Ollama?** Easy CLI-based local AI, great performance.

1. **Install:**
   ```bash
   # Linux/macOS
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Or download from https://ollama.ai/
   ```

2. **Setup:**
   ```bash
   # Pull a model
   ollama pull llama3.2:3b
   
   # Start server
   ollama serve
   ```

3. **Configure:**
   ```bash
   # Edit .env.local
   VITE_OLLAMA_BASE_URL=http://localhost:11434
   VITE_OLLAMA_MODEL=llama3.2:3b
   ```

## TreeQuest Integration

### Connecting to Your TreeQuest Repository

The app includes a simplified TreeQuest implementation, but you can integrate with your full TreeQuest repository:

```typescript
// In src/services/treequest.ts (create this file)
import treequest as tq from '/home/ty/Repositories/treequest'

export class TreeQuestService {
  private algo: any
  private searchTree: any

  constructor() {
    this.algo = tq.ABMCTSA()
    this.searchTree = this.algo.init_tree()
  }

  async generateNodes(parentState: any): Promise<[any, number]> {
    // Your node generation logic using AI services
    const aiResponse = await aiService.generateContent({
      prompt: `Generate related concepts for: ${parentState.label}`,
      context: parentState.content
    })
    
    const newState = {
      label: extractConceptLabel(aiResponse.content),
      content: aiResponse.content
    }
    
    const score = calculateRelevanceScore(newState, parentState)
    return [newState, score]
  }

  async runSearch(iterations: number = 50): Promise<any[]> {
    for (let i = 0; i < iterations; i++) {
      this.searchTree = this.algo.step(
        this.searchTree, 
        { 'expand': this.generateNodes.bind(this) }
      )
    }
    
    return tq.top_k(this.searchTree, this.algo, 5)
  }
}
```

### Performance Optimization

Following the pragmatic performance principles:

```typescript
// Use Sets for O(1) node lookups
const nodeSet = new Set(nodes.map(n => n.id))

// Use Map for O(1) edge lookups  
const edgeMap = new Map(edges.map(e => [e.id, e]))

// Batch operations for better performance
const batchSize = 50
const batches = chunk(operations, batchSize)

// Use memoization for expensive calculations
const memoizedDistance = useMemo(() => {
  const cache = new Map()
  return (a, b) => {
    const key = `${a.id}-${b.id}`
    if (cache.has(key)) return cache.get(key)
    const result = calculateDistance(a, b)
    cache.set(key, result)
    return result
  }
}, [])
```

## Graph Database Integration

To integrate with the graph database concepts from your documents:

### Neo4j Setup (Optional)

```bash
# Install Neo4j
docker run \
  --publish=7474:7474 --publish=7687:7687 \
  --volume=$HOME/neo4j/data:/data \
  neo4j:latest
```

### Cypher Queries

```typescript
// Example Cypher queries for knowledge graphs
const queries = {
  createNode: `
    CREATE (n:Concept {
      id: $id,
      label: $label,
      content: $content,
      created: datetime()
    })
  `,
  
  findRelated: `
    MATCH (n:Concept)-[r]-(related:Concept)
    WHERE n.id = $nodeId
    RETURN related, r
    ORDER BY r.weight DESC
    LIMIT 10
  `,
  
  clusterAnalysis: `
    CALL gds.louvain.stream('concept-graph')
    YIELD nodeId, communityId
    MATCH (n:Concept) WHERE id(n) = nodeId
    RETURN n.label, communityId
  `
}
```

## Material UI Customization

### Dark Theme Extensions

```typescript
// Extend the theme for your specific needs
const customTheme = createTheme({
  ...cognitiveTheme,
  components: {
    ...cognitiveTheme.components,
    
    // Custom graph components
    MuiGraphNode: {
      styleOverrides: {
        root: {
          '&.selected': {
            boxShadow: `0 0 20px ${theme.palette.primary.main}`,
            transform: 'scale(1.1)'
          },
          '&.ai-generated': {
            borderStyle: 'dashed',
            animation: 'pulse 2s infinite'
          }
        }
      }
    }
  }
})
```

## Development Workflow

### 1. Start the Development Environment

```bash
# Terminal 1: Start the app
npm run dev

# Terminal 2: Start Ollama (if using)
ollama serve

# Terminal 3: Start LM Studio (if using)
# Open LM Studio GUI and start server
```

### 2. Testing AI Integration

```typescript
// Test all AI providers
const testPrompt = "What is consciousness?"

// Test Gemini
await aiService.setActiveProvider('gemini')
const geminiResponse = await aiService.generateContent({ prompt: testPrompt })

// Test LM Studio
await aiService.setActiveProvider('lmstudio')  
const lmStudioResponse = await aiService.generateContent({ prompt: testPrompt })

// Test Ollama
await aiService.setActiveProvider('ollama')
const ollamaResponse = await aiService.generateContent({ prompt: testPrompt })
```

### 3. Building for Production

```bash
# Web build
npm run build

# Desktop app (Electron)
npm run electron-build

# The built app will be in dist-electron/
```

## Troubleshooting

### Common Issues

1. **API Key Issues:**
   ```bash
   # Check if API key is loaded
   console.log(import.meta.env.VITE_GEMINI_API_KEY)
   ```

2. **Local AI Connection:**
   ```bash
   # Test Ollama
   curl http://localhost:11434/api/tags
   
   # Test LM Studio  
   curl http://localhost:1234/v1/models
   ```

3. **Build Errors:**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### Performance Monitoring

```typescript
// Add performance monitoring
const performanceMetrics = {
  nodeCount: nodes.size,
  edgeCount: edges.size,
  renderTime: Date.now() - startTime,
  memoryUsage: performance.memory?.usedJSHeapSize || 0
}

console.log('Graph Performance:', performanceMetrics)
```

## Next Steps

1. **Integrate with your existing repositories:**
   - Connect to `/home/ty/Repositories/treequest` for full AB-MCTS
   - Use `/home/ty/Repositories/infranodus` patterns for graph analysis
   - Incorporate concepts from your AI agent repositories

2. **Extend functionality:**
   - Add export to various formats (GraphML, GEXF, etc.)
   - Implement real-time collaboration
   - Add advanced clustering algorithms
   - Create custom AI agents for specific domains

3. **Deploy:**
   - Build as desktop app with Electron
   - Create web deployment with Vite
   - Set up CI/CD with GitHub Actions

Happy knowledge graphing! 🧠✨
