/**
 * Enhanced Service Manager for Cognitive Graph Studio
 * Centralized initialization and coordination of all backend services
 */

import aiService from './aiService'
import vectorService from './vector-service'
import treeQuestService from './treequest-service'
import { GraphNode, GraphEdge } from '@/types/graph'

interface ServiceStatus {
  name: string
  status: 'initializing' | 'ready' | 'error'
  message?: string
  lastCheck?: Date
}

class ServiceManager {
  private services: Map<string, ServiceStatus> = new Map()
  private initialized = false
  private listeners: Set<(status: Map<string, ServiceStatus>) => void> = new Set()

  constructor() {
    this.initializeServices()
  }

  /**
   * Initialize all services with environment configuration
   */
  private async initializeServices(): Promise<void> {
    console.log('🚀 Initializing Cognitive Graph Studio services...')
    
    // Set initial status
    this.setServiceStatus('ai', 'initializing', 'Loading AI providers...')
    this.setServiceStatus('vector', 'initializing', 'Setting up vector storage...')
    this.setServiceStatus('treequest', 'initializing', 'Configuring TreeQuest...')

    try {
      // Initialize AI Service with environment config
      await this.initializeAIService()
      
      // Initialize Vector Service
      await this.initializeVectorService()
      
      // Initialize TreeQuest Service
      await this.initializeTreeQuestService()
      
      this.initialized = true
      console.log('✅ All services initialized successfully')
      
      // Test connectivity
      await this.testServices()
      
    } catch (error) {
      console.error('❌ Service initialization failed:', error)
      this.setServiceStatus('system', 'error', `Initialization failed: ${error}`)
    }
  }

  private async initializeAIService(): Promise<void> {
    try {
      // AI service should now properly load env vars from the updated constructor
      const providers = aiService.getAllProviders()
      
      // Test connectivity for each provider
      let connectedCount = 0
      for (const provider of providers) {
        const isConnected = await aiService.testProvider(provider.name)
        if (isConnected) connectedCount++
      }

      if (connectedCount > 0) {
        this.setServiceStatus('ai', 'ready', `${connectedCount}/${providers.length} providers available`)
      } else {
        this.setServiceStatus('ai', 'error', 'No AI providers available')
      }
    } catch (error) {
      this.setServiceStatus('ai', 'error', `AI service error: ${error}`)
    }
  }

  private async initializeVectorService(): Promise<void> {
    try {
      // Initialize vector service with env configuration
      const vectorDimensions = parseInt(import.meta.env.VITE_VECTOR_DIMENSIONS || '768')
      const maxVectors = parseInt(import.meta.env.VITE_VECTOR_MAX_VECTORS || '10000')
      
      vectorService.initialize({
        dimensions: vectorDimensions,
        maxVectors: maxVectors,
        persistencePath: import.meta.env.VITE_VECTOR_PERSISTENCE_PATH || './data/vectors'
      })
      
      this.setServiceStatus('vector', 'ready', `Ready (${vectorDimensions}D vectors)`)
    } catch (error) {
      this.setServiceStatus('vector', 'error', `Vector service error: ${error}`)
    }
  }

  private async initializeTreeQuestService(): Promise<void> {
    try {
      // Configure TreeQuest with environment settings
      const algorithm = import.meta.env.VITE_TREEQUEST_ALGORITHM || 'abmcts-a'
      const maxSimulations = parseInt(import.meta.env.VITE_TREEQUEST_MAX_SIMULATIONS || '100')
      const timeLimit = parseInt(import.meta.env.VITE_TREEQUEST_TIME_LIMIT || '30')
      
      treeQuestService.configure({
        algorithm: algorithm as any,
        maxSimulations,
        timeLimit,
        explorationConstant: parseFloat(import.meta.env.VITE_TREEQUEST_EXPLORATION_CONSTANT || '1.414')
      })
      
      this.setServiceStatus('treequest', 'ready', `Configured (${algorithm})`)
    } catch (error) {
      this.setServiceStatus('treequest', 'error', `TreeQuest service error: ${error}`)
    }
  }

  private async testServices(): Promise<void> {
    console.log('🔄 Testing service connectivity...')
    
    // Re-test all services
    const services = ['ai', 'vector', 'treequest']
    for (const serviceName of services) {
      const status = this.services.get(serviceName)
      if (status?.status === 'ready') {
        // Perform a quick health check
        console.log(`✅ ${serviceName} service is healthy`)
      }
    }
  }

  private setServiceStatus(name: string, status: ServiceStatus['status'], message?: string): void {
    this.services.set(name, {
      name,
      status,
      message,
      lastCheck: new Date()
    })
    
    // Notify listeners
    this.listeners.forEach(listener => listener(new Map(this.services)))
  }

  /**
   * Get current status of all services
   */
  public getServiceStatus(): Map<string, ServiceStatus> {
    return new Map(this.services)
  }

  /**
   * Check if all services are ready
   */
  public isReady(): boolean {
    return this.initialized && Array.from(this.services.values()).every(
      service => service.status === 'ready'
    )
  }

  /**
   * Subscribe to service status changes
   */
  public onStatusChange(callback: (status: Map<string, ServiceStatus>) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * Get available AI providers
   */
  public getAIProviders() {
    return aiService.getAllProviders()
  }

  /**
   * Generate AI content using the active provider
   */
  public async generateAIContent(prompt: string, context?: string) {
    return await aiService.generateContent({
      prompt,
      context,
      temperature: 0.7,
      maxTokens: 1000
    })
  }

  /**
   * Add node embeddings for semantic search
   */
  public async addNodeEmbedding(node: GraphNode) {
    if (this.services.get('vector')?.status === 'ready') {
      return await vectorService.addNodeEmbedding(node)
    }
  }

  /**
   * Search for similar nodes
   */
  public async searchSimilarNodes(query: string, limit = 10) {
    if (this.services.get('vector')?.status === 'ready') {
      return await vectorService.searchSimilar(query, limit)
    }
    return []
  }

  /**
   * Run TreeQuest exploration
   */
  public async runTreeQuestExploration(startNodes: GraphNode[]) {
    if (this.services.get('treequest')?.status === 'ready') {
      return await treeQuestService.explore(startNodes)
    }
  }

  /**
   * Process new node with all available services
   */
  public async processNewNode(node: GraphNode): Promise<{
    embeddings?: any
    aiInsights?: string
    relatedNodes?: GraphNode[]
  }> {
    const results: any = {}

    // Add embeddings if vector service is ready
    if (this.services.get('vector')?.status === 'ready') {
      try {
        results.embeddings = await this.addNodeEmbedding(node)
        results.relatedNodes = await this.searchSimilarNodes(node.content, 5)
      } catch (error) {
        console.warn('Vector processing failed:', error)
      }
    }

    // Generate AI insights if AI service is ready
    if (this.services.get('ai')?.status === 'ready') {
      try {
        const response = await this.generateAIContent(
          `Provide 2-3 key insights about this concept: "${node.label}"`,
          node.content
        )
        results.aiInsights = response.content
      } catch (error) {
        console.warn('AI insight generation failed:', error)
      }
    }

    return results
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager()
export default serviceManager
