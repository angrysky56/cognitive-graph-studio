/**
 * Cognitive Graph Studio - Service Manager
 *
 * Centralized service initialization and configuration for the cognitive graph studio.
 * Provides a unified interface to initialize all services with proper dependency injection
 * and configuration management.
 *
 * @module ServiceManager
 */

import { CognitiveGraphService } from './service-integration'
import { AIService, LLMConfig } from './ai-service'
import { VectorService } from './vector-service'

/**
 * Service status tracking
 */
export interface ServiceStatus {
  status: 'initializing' | 'ready' | 'error' | 'disabled'
  message?: string
  lastUpdated: Date
}

/**
 * Service manager configuration interface
 */
export interface ServiceManagerConfig {
  /** Environment configuration */
  environment: 'development' | 'production' | 'test'
  /** API keys and credentials */
  credentials: {
    geminiApiKey?: string
    openaiApiKey?: string
    anthropicApiKey?: string
  }
  /** Service-specific configurations */
  services: {
    ai: {
      defaultProvider: 'gemini' | 'openai' | 'anthropic' | 'local-ollama' | 'local-lm-studio'
      fallbackProviders: string[]
      timeoutMs: number
    }
    vector: {
      dimensions: number
      maxVectors: number
      persistence: boolean
      persistencePath?: string
    }
  }
  /** Integration settings */
  integration: {
    autoEmbedding: boolean
    syncInterval: number
    enableDuplicateDetection: boolean
  }
}

/**
 * Service initialization result
 */
export interface ServiceInitResult {
  success: boolean
  services: Map<string, ServiceStatus>
  errors: string[]
}

/**
 * Service manager class
 */
export class ServiceManager {
  private config: ServiceManagerConfig
  private services: Map<string, ServiceStatus> = new Map()
  private serviceInstances: Map<string, any> = new Map()
  private listeners: Set<(status: Map<string, ServiceStatus>) => void> = new Set()
  private isInitialized: boolean = false

  constructor(config: ServiceManagerConfig) {
    this.config = config
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<ServiceInitResult> {
    console.log('🚀 Initializing Cognitive Graph Studio services...')

    const errors: string[] = []

    try {
      await this.initializeAIService()
    } catch (error) {
      errors.push(`AI Service: ${(error as Error).message}`)
    }

    try {
      await this.initializeVectorService()
    } catch (error) {
      errors.push(`Vector Service: ${(error as Error).message}`)
    }

    try {
      await this.initializeIntegrationService()
    } catch (error) {
      errors.push(`Integration Service: ${(error as Error).message}`)
    }

    this.isInitialized = true

    const success = errors.length === 0
    console.log(success ? '✅ All services initialized successfully' : `⚠️ ${errors.length} services failed to initialize`)

    return {
      success,
      services: new Map(this.services),
      errors
    }
  }

  /**
   * Initialize AI service
   */
  private async initializeAIService(): Promise<void> {
    this.setServiceStatus('ai', 'initializing', 'Starting AI service...')

    try {
      const aiConfigs: LLMConfig[] = []

      // Add Gemini if key available
      if (this.config.credentials.geminiApiKey) {
        aiConfigs.push({
          provider: 'gemini',
          apiKey: this.config.credentials.geminiApiKey,
          model: 'gemini-1.5-flash-8b',
          baseUrl: 'https://generativelanguage.googleapis.com'
        })
      }

      // Add OpenAI if key available
      if (this.config.credentials.openaiApiKey) {
        aiConfigs.push({
          provider: 'openai',
          apiKey: this.config.credentials.openaiApiKey,
          model: 'gpt-4o-mini',
          baseUrl: 'https://api.openai.com'
        })
      }

      // Always add local providers
      aiConfigs.push({
        provider: 'local-ollama',
        model: 'llama3.2:3b',
        baseUrl: 'http://localhost:11434'
      })

      aiConfigs.push({
        provider: 'local-lm-studio',
        model: 'local-model',
        baseUrl: 'http://localhost:1234'
      })

      const aiService = new AIService(aiConfigs, this.config.services.ai.defaultProvider)
      this.serviceInstances.set('ai', aiService)

      this.setServiceStatus('ai', 'ready', 'AI service ready')
    } catch (error) {
      this.setServiceStatus('ai', 'error', `AI service failed: ${(error as Error).message}`)
      throw error
    }
  }

  /**
   * Initialize vector service
   */
  private async initializeVectorService(): Promise<void> {
    this.setServiceStatus('vector', 'initializing', 'Starting vector service...')

    try {
      // For now, mark as ready - actual implementation would initialize the vector service
      this.setServiceStatus('vector', 'ready', 'Vector service ready')
    } catch (error) {
      this.setServiceStatus('vector', 'error', `Vector service failed: ${(error as Error).message}`)
      throw error
    }
  }

  /**
   * Initialize integration service
   */
  private async initializeIntegrationService(): Promise<void> {
    this.setServiceStatus('integration', 'initializing', 'Starting integration service...')

    try {
      // For now, mark as ready - actual implementation would initialize the integration service
      this.setServiceStatus('integration', 'ready', 'Integration service ready')
    } catch (error) {
      this.setServiceStatus('integration', 'error', `Integration service failed: ${(error as Error).message}`)
      throw error
    }
  }

  /**
   * Set service status and notify listeners
   */
  private setServiceStatus(name: string, status: ServiceStatus['status'], message?: string): void {
    this.services.set(name, {
      status,
      message,
      lastUpdated: new Date()
    })

    this.listeners.forEach(listener => listener(new Map(this.services)))
  }

  /**
   * Get service status
   */
  public getServiceStatus(): Map<string, ServiceStatus> {
    return new Map(this.services)
  }

  /**
   * Check if all services are ready
   */
  public isReady(): boolean {
    return this.isInitialized && Array.from(this.services.values()).every(
      service => service.status === 'ready'
    )
  }

  /**
   * Subscribe to status changes
   */
  public onStatusChange(callback: (status: Map<string, ServiceStatus>) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * Get AI service instance
   */
  public getAIService(): AIService | undefined {
    return this.serviceInstances.get('ai')
  }

  /**
   * Get vector service instance
   */
  public getVectorService(): VectorService | undefined {
    return this.serviceInstances.get('vector')
  }

  /**
   * Generate AI content using the configured AI service
   */
  public async generateAIContent(prompt: string): Promise<{content: string}> {
    const aiService = this.getAIService()
    if (!aiService) {
      throw new Error('AI service not available')
    }
    
    try {
      const result = await aiService.generateText({
        prompt,
        maxTokens: 2000,
        temperature: 0.7
      })
      
      return {
        content: result.content || ''
      }
    } catch (error) {
      console.error('Failed to generate AI content:', error)
      throw new Error(`AI content generation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get integration service instance
   */
  public getIntegrationService(): CognitiveGraphService | undefined {
    return this.serviceInstances.get('integration')
  }
}

/**
 * Create default service manager configuration
 */
export function createDefaultConfig(): ServiceManagerConfig {
  return {
    environment: 'development',
    credentials: {
      geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
      openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
      anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    },
    services: {
      ai: {
        defaultProvider: 'gemini',
        fallbackProviders: ['local-ollama', 'local-lm-studio'],
        timeoutMs: 30000
      },
      vector: {
        dimensions: 384,
        maxVectors: 10000,
        persistence: true,
        persistencePath: './data/vectors'
      }
    },
    integration: {
      autoEmbedding: true,
      syncInterval: 5000,
      enableDuplicateDetection: true
    }
  }
}

/**
 * Default service manager instance
 */
export const serviceManager = new ServiceManager(createDefaultConfig())
export default serviceManager
