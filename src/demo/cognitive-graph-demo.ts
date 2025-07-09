/**
 * Cognitive Graph Studio - Demo Implementation
 * 
 * Demonstrates the enhanced API integrations including:
 * - Multi-LLM AI service with Gemini, OpenAI, and local providers
 * - Vector embedding service for semantic search
 * - TreeQuest AB-MCTS enhanced reasoning
 * - Integrated service coordination
 * 
 * @module Demo
 */

import { 
  ServiceManager, 
  getServiceManager, 
  initializeServices,
  ServiceManagerConfig 
} from '../services/service-manager'
import { 
  EnhancedQuery
} from '../services/service-integration'

/**
 * Demo configuration for development
 */
const DEMO_CONFIG: Partial<ServiceManagerConfig> = {
  environment: 'development',
  credentials: {
    // These should be loaded from environment variables
    geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
    anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY
  },
  services: {
    ai: {
      defaultProvider: 'gemini',
      fallbackProviders: ['local-ollama'],
      timeoutMs: 15000
    },
    vector: {
      dimensions: 768,
      maxVectors: 5000,
      persistence: false // Disable for demo
    },
    treequest: {
      algorithm: 'abmcts-a',
      maxSimulations: 50, // Reduced for demo speed
      timeLimit: 15,
      explorationConstant: 1.414
    }
  },
  integration: {
    autoEmbedding: true,
    useTreeQuestForComplexQueries: true,
    complexityThreshold: 0.5,
    cacheEnabled: true,
    cacheTtl: 300000,
    cacheMaxSize: 100
  }
}

/**
 * Demo class showcasing cognitive graph capabilities
 */
export class CognitiveGraphDemo {
  private serviceManager: ServiceManager
  private isInitialized = false

  constructor() {
    this.serviceManager = getServiceManager(DEMO_CONFIG)
  }

  /**
   * Initialize demo environment
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    console.log('🚀 Initializing Cognitive Graph Studio Demo...')

    try {
      const result = await initializeServices(DEMO_CONFIG)
      
      if (result.success) {
        console.log('✅ All services initialized successfully!')
        this.isInitialized = true
        return true
      } else {
        console.error('❌ Service initialization failed:', result.errors)
        return false
      }
    } catch (error) {
      console.error('❌ Demo initialization error:', error)
      return false
    }
  }

  /**
   * Run comprehensive demo showcasing all capabilities
   */
  async runComprehensiveDemo(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Demo not initialized. Call initialize() first.')
    }

    console.log('\n🎯 Starting Comprehensive Cognitive Graph Demo...\n')

    // Demo 1: Simple semantic search
    await this.demoSimpleSemanticSearch()

    // Demo 2: Complex AI-enhanced query
    await this.demoComplexQuery()

    // Demo 3: TreeQuest enhanced reasoning
    await this.demoTreeQuestReasoning()

    // Demo 4: Multi-service integration
    await this.demoMultiServiceIntegration()

    // Demo 5: Health monitoring
    await this.demoHealthMonitoring()

    console.log('\n🎉 Demo completed successfully!')
  }

  /**
   * Demo 1: Simple semantic search
   */
  private async demoSimpleSemanticSearch(): Promise<void> {
    console.log('📍 Demo 1: Simple Semantic Search')
    console.log('━'.repeat(50))

    try {
      const cognitiveService = this.serviceManager.getCognitiveGraphService()

      const query: EnhancedQuery = {
        query: 'artificial intelligence machine learning',
        type: 'simple',
        filters: {
          tags: ['ai', 'technology']
        }
      }

      console.log(`🔍 Searching for: "${query.query}"`)
      const startTime = Date.now()
      
      const result = await cognitiveService.executeEnhancedQuery(query)
      
      const elapsed = Date.now() - startTime
      console.log(`⚡ Search completed in ${elapsed}ms`)
      console.log(`📊 Found ${result.searchResults.length} results`)
      console.log(`🎯 Confidence: ${(result.metrics.confidence * 100).toFixed(1)}%`)
      console.log(`🔧 Services used: ${result.metadata.servicesUsed.join(', ')}`)
      console.log(`💾 Cache hit: ${result.metadata.cacheHit ? 'Yes' : 'No'}`)

    } catch (error) {
      console.error('❌ Simple search demo failed:', error)
    }

    console.log('')
  }

  /**
   * Demo 2: Complex AI-enhanced query
   */
  private async demoComplexQuery(): Promise<void> {
    console.log('📍 Demo 2: Complex AI-Enhanced Query')
    console.log('━'.repeat(50))

    try {
      const cognitiveService = this.serviceManager.getCognitiveGraphService()

      const query: EnhancedQuery = {
        query: 'How can we improve neural network training efficiency using modern optimization techniques?',
        type: 'complex',
        generation: {
          temperature: 0.7,
          maxTokens: 300
        }
      }

      console.log(`🧠 Complex query: "${query.query}"`)
      const startTime = Date.now()
      
      const result = await cognitiveService.executeEnhancedQuery(query)
      
      const elapsed = Date.now() - startTime
      console.log(`⚡ Query completed in ${elapsed}ms`)
      console.log(`📝 Generated content length: ${result.generatedContent?.length || 0} characters`)
      console.log(`🔤 Tokens used: ${result.metrics.tokensUsed}`)
      console.log(`🎯 Overall confidence: ${(result.metrics.confidence * 100).toFixed(1)}%`)
      
      if (result.generatedContent) {
        console.log(`💡 Generated insight (first 200 chars):\n"${result.generatedContent.substring(0, 200)}..."`)
      }

    } catch (error) {
      console.error('❌ Complex query demo failed:', error)
    }

    console.log('')
  }

  /**
   * Demo 3: TreeQuest enhanced reasoning
   */
  private async demoTreeQuestReasoning(): Promise<void> {
    console.log('📍 Demo 3: TreeQuest Enhanced Reasoning')
    console.log('━'.repeat(50))

    try {
      const cognitiveService = this.serviceManager.getCognitiveGraphService()

      const query: EnhancedQuery = {
        query: 'What is the optimal strategy for scaling a machine learning model deployment?',
        type: 'reasoning',
        reasoning: {
          depth: 3,
          timeLimit: 10,
          useMultiModel: false
        }
      }

      console.log(`🌳 TreeQuest reasoning: "${query.query}"`)
      const startTime = Date.now()
      
      const result = await cognitiveService.executeEnhancedQuery(query)
      
      const elapsed = Date.now() - startTime
      console.log(`⚡ Reasoning completed in ${elapsed}ms`)
      
      if (result.reasoningResult) {
        console.log(`🏆 Best action: "${result.reasoningResult.bestAction}"`)
        console.log(`🎯 Reasoning confidence: ${(result.reasoningResult.confidence * 100).toFixed(1)}%`)
        console.log(`🔍 Nodes explored: ${result.reasoningResult.searchStats.nodesExplored}`)
        console.log(`📏 Search depth: ${result.reasoningResult.searchStats.depth}`)
        console.log(`💭 Reasoning: ${result.reasoningResult.reasoning}`)
        
        if (result.reasoningResult.alternativeActions.length > 0) {
          console.log('🔄 Alternative actions:')
          result.reasoningResult.alternativeActions.forEach((alt, i) => {
            console.log(`   ${i + 1}. ${alt.action} (score: ${alt.score.toFixed(3)})`)
          })
        }
      }

    } catch (error) {
      console.error('❌ TreeQuest reasoning demo failed:', error)
    }

    console.log('')
  }

  /**
   * Demo 4: Multi-service integration
   */
  private async demoMultiServiceIntegration(): Promise<void> {
    console.log('📍 Demo 4: Multi-Service Integration')
    console.log('━'.repeat(50))

    try {
      const cognitiveService = this.serviceManager.getCognitiveGraphService()

      const query: EnhancedQuery = {
        query: 'Analyze the relationship between quantum computing and artificial intelligence',
        type: 'discovery',
        contextNodes: ['quantum-computing', 'artificial-intelligence'],
        generation: {
          temperature: 0.8,
          maxTokens: 400
        },
        reasoning: {
          depth: 2,
          timeLimit: 8,
          useMultiModel: false
        }
      }

      console.log(`🔗 Multi-service query: "${query.query}"`)
      const startTime = Date.now()
      
      const result = await cognitiveService.executeEnhancedQuery(query)
      
      const elapsed = Date.now() - startTime
      console.log(`⚡ Integration completed in ${elapsed}ms`)
      console.log(`🛠️ Services used: ${result.metadata.servicesUsed.join(', ')}`)
      console.log(`📊 Complexity score: ${result.metadata.complexityScore.toFixed(3)}`)
      
      // Performance breakdown
      console.log('⏱️ Performance breakdown:')
      console.log(`   Search: ${result.metrics.searchTime}ms`)
      console.log(`   Generation: ${result.metrics.generationTime}ms`)
      console.log(`   Reasoning: ${result.metrics.reasoningTime}ms`)
      console.log(`   Total: ${result.metrics.totalTime}ms`)

    } catch (error) {
      console.error('❌ Multi-service integration demo failed:', error)
    }

    console.log('')
  }

  /**
   * Demo 5: Health monitoring
   */
  private async demoHealthMonitoring(): Promise<void> {
    console.log('📍 Demo 5: Service Health Monitoring')
    console.log('━'.repeat(50))

    try {
      const health = await this.serviceManager.getHealthStatus()
      
      console.log(`🏥 Overall health: ${health.overall ? '✅ Healthy' : '❌ Unhealthy'}`)
      console.log('🔧 Service status:')
      console.log(`   AI Service: ${health.services.ai ? '✅' : '❌'}`)
      console.log(`   Vector Service: ${health.services.vector ? '✅' : '❌'}`)
      console.log(`   TreeQuest Service: ${health.services.treequest ? '✅' : '❌'}`)
      console.log(`   Integration: ${health.services.integration ? '✅' : '❌'}`)
      console.log(`💬 Status: ${health.message}`)

    } catch (error) {
      console.error('❌ Health monitoring demo failed:', error)
    }

    console.log('')
  }

  /**
   * Demo for testing individual services
   */
  async runServiceTests(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Demo not initialized. Call initialize() first.')
    }

    console.log('\n🧪 Running Individual Service Tests...\n')

    try {
      const services = this.serviceManager.getServices()

      // Test AI service
      console.log('🤖 Testing AI Service...')
      try {
        const aiResponse = await services.ai.generateText({
          prompt: 'Explain quantum computing in one sentence.',
          maxTokens: 50
        })
        console.log(`✅ AI Service: Generated ${aiResponse.content.length} characters`)
        console.log(`   Model: ${aiResponse.metadata.model}`)
        console.log(`   Tokens: ${aiResponse.metadata.tokens.total}`)
      } catch (error) {
        console.log(`❌ AI Service test failed: ${error}`)
      }

      // Test Vector service
      console.log('\n🔍 Testing Vector Service...')
      try {
        const stats = await services.vector.getStatistics()
        console.log(`✅ Vector Service: ${stats.totalVectors} vectors, ${stats.dimensions} dimensions`)
        console.log(`   Memory usage: ${(stats.memoryUsage / 1024).toFixed(1)} KB`)
      } catch (error) {
        console.log(`❌ Vector Service test failed: ${error}`)
      }

      console.log('\n✅ Service tests completed!')

    } catch (error) {
      console.error('❌ Service test error:', error)
    }
  }

  /**
   * Clean up demo resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up demo resources...')
    await this.serviceManager.shutdown()
    this.isInitialized = false
    console.log('✅ Cleanup completed!')
  }
}

/**
 * Run the demo if this file is executed directly
 */
export async function runDemo(): Promise<void> {
  const demo = new CognitiveGraphDemo()
  
  try {
    const initialized = await demo.initialize()
    
    if (initialized) {
      await demo.runComprehensiveDemo()
      await demo.runServiceTests()
    } else {
      console.error('❌ Failed to initialize demo environment')
    }
  } catch (error) {
    console.error('❌ Demo execution failed:', error)
  } finally {
    await demo.cleanup()
  }
}

// Auto-run demo if this module is imported in development
if (import.meta.env.VITE_APP_ENVIRONMENT === 'development') {
  console.log('🔧 Development mode detected - demo available via runDemo()')
}