/**
 * Cognitive Graph Studio - Service Manager
 * 
 * Centralized service initialization and configuration for the cognitive graph studio.
 * Provides a unified interface to initialize all services with proper dependency injection
 * and configuration management.
 * 
 * @module ServiceManager
 */

import { CognitiveGraphService, IntegratedServiceConfig } from './service-integration'
import { AIService } from './ai-service'
import { VectorService } from './vector-service'
import { TreeQuestService } from './treequest-service'

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
    treequest: {
      algorithm: 'abmcts-a' | 'abmcts-m'
      maxSimulations: number
      timeLimit: number
      explorationConstant: number
    }
  }
  /** Integration settings */
  integration: {
    autoEmbedding: boolean
    useTreeQuestForComplexQueries: boolean
    complexityThreshold: number
    cacheEnabled: boolean
    cacheTtl: number
    cacheMaxSize: number
  }
}

/**
 * Default configuration for development environment
 */
export const DEFAULT_CONFIG: ServiceManagerConfig = {
  environment: 'development',
  credentials: {
    // These should be loaded from environment variables
    geminiApiKey: process.env.VITE_GEMINI_API_KEY,
    openaiApiKey: process.env.VITE_OPENAI_API_KEY,
    anthropicApiKey: process.env.VITE_ANTHROPIC_API_KEY
  },
  services: {
    ai: {
      defaultProvider: 'gemini',
      fallbackProviders: ['openai', 'local-ollama'],
      timeoutMs: 30000
    },
    vector: {
      dimensions: 768, // Standard for many embedding models
      maxVectors: 10000,
      persistence: true,
      persistencePath: './data/vectors'
    },
    treequest: {
      algorithm: 'abmcts-a',
      maxSimulations: 100,
      timeLimit: 30,
      explorationConstant: 1.414 // √2, standard UCB1 constant
    }
  },
  integration: {
    autoEmbedding: true,
    useTreeQuestForComplexQueries: true,
    complexityThreshold: 0.6,
    cacheEnabled: true,
    cacheTtl: 300000, // 5 minutes
    cacheMaxSize: 1000
  }
}

/**
 * Service initialization result
 */
export interface ServiceInitResult {
  success: boolean
  services: {
    ai: boolean
    vector: boolean
    treequest: boolean
    integration: boolean
  }
  errors: string[]
  warnings: string[]
}

/**
 * Service manager for Cognitive Graph Studio
 * 
 * Manages lifecycle of all services and provides unified configuration.
 * Handles initialization, health checks, and graceful shutdown.
 */
export class ServiceManager {
  private config: ServiceManagerConfig
  private cognitiveGraphService: CognitiveGraphService | null = null
  private isInitialized = false
  private initializationPromise: Promise<ServiceInitResult> | null = null

  /**
   * Create service manager with configuration
   */
  constructor(config: Partial<ServiceManagerConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config)
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<ServiceInitResult> {
    // Prevent multiple initialization attempts
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.performInitialization()
    return this.initializationPromise
  }

  /**
   * Get the integrated cognitive graph service
   */
  getCognitiveGraphService(): CognitiveGraphService {
    if (!this.isInitialized || !this.cognitiveGraphService) {
      throw new Error('Service manager not initialized. Call initialize() first.')
    }
    return this.cognitiveGraphService
  }

  /**
   * Get individual services for legacy compatibility
   */
  getServices() {
    if (!this.isInitialized || !this.cognitiveGraphService) {
      throw new Error('Service manager not initialized. Call initialize() first.')
    }

    // Create legacy service instances for backward compatibility
    const aiService = new AIService(
      this.createAIConfigs(),
      this.config.services.ai.defaultProvider
    )

    const vectorService = new VectorService()
    const treeQuestService = new TreeQuestService()

    return {
      ai: aiService,
      vector: vectorService,
      treequest: treeQuestService,
      integrated: this.cognitiveGraphService
    }
  }

  /**
   * Check health status of all services
   */
  async getHealthStatus() {
    if (!this.cognitiveGraphService) {
      return {
        overall: false,
        services: {
          ai: false,
          vector: false,
          treequest: false,
          integration: false
        },
        message: 'Services not initialized'
      }
    }

    try {
      const health = await this.cognitiveGraphService.getHealthStatus()
      return {
        overall: health.overall,
        services: {
          ai: health.ai,
          vector: health.vector,
          treequest: health.treequest,
          integration: health.overall
        },
        message: health.overall ? 'All services healthy' : 'Some services unavailable'
      }
    } catch (error) {
      return {
        overall: false,
        services: {
          ai: false,
          vector: false,
          treequest: false,
          integration: false
        },
        message: `Health check failed: ${error}`
      }
    }
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<ServiceManagerConfig>): void {
    this.config = this.mergeConfig(this.config, newConfig)
    
    // Note: Some config changes may require service reinitialization
    if (this.isInitialized) {
      console.warn('Configuration updated after initialization. Some changes may require restart.')
    }
  }

  /**
   * Gracefully shutdown all services
   */
  async shutdown(): Promise<void> {
    if (this.cognitiveGraphService) {
      // Perform any necessary cleanup
      console.log('Shutting down cognitive graph services...')
    }
    
    this.isInitialized = false
    this.cognitiveGraphService = null
    this.initializationPromise = null
  }

  /**
   * Get current configuration
   */
  getConfig(): ServiceManagerConfig {
    return { ...this.config }
  }

  /**
   * Private method: Perform actual initialization
   */
  private async performInitialization(): Promise<ServiceInitResult> {
    const result: ServiceInitResult = {
      success: false,
      services: {
        ai: false,
        vector: false,
        treequest: false,
        integration: false
      },
      errors: [],
      warnings: []
    }

    try {
      // Validate configuration
      this.validateConfig()

      // Create integrated service configuration
      const integratedConfig = this.createIntegratedConfig()

      // Initialize integrated service
      this.cognitiveGraphService = new CognitiveGraphService(integratedConfig)
      await this.cognitiveGraphService.initialize()

      // Mark as initialized
      this.isInitialized = true
      result.success = true
      result.services = {
        ai: true,
        vector: true,
        treequest: true,
        integration: true
      }

    } catch (error) {
      result.errors.push(`Initialization failed: ${error}`)
      console.error('Service initialization error:', error)
    }

    return result
  }

  /**
   * Private method: Validate configuration
   */
  private validateConfig(): void {
    const { credentials, services } = this.config

    // Check for required API keys based on default provider
    if (services.ai.defaultProvider === 'gemini' && !credentials.geminiApiKey) {
      throw new Error('Gemini API key required for default provider')
    }
    if (services.ai.defaultProvider === 'openai' && !credentials.openaiApiKey) {
      throw new Error('OpenAI API key required for default provider')
    }
    if (services.ai.defaultProvider === 'anthropic' && !credentials.anthropicApiKey) {
      throw new Error('Anthropic API key required for default provider')
    }

    // Validate vector dimensions
    if (services.vector.dimensions <= 0) {
      throw new Error('Vector dimensions must be positive')
    }

    // Validate TreeQuest parameters
    if (services.treequest.maxSimulations <= 0) {
      throw new Error('TreeQuest max simulations must be positive')
    }
  }

  /**
   * Private method: Create AI service configurations
   */
  private createAIConfigs() {
    const { credentials, services } = this.config

    const configs = []

    // Add Gemini config if API key available
    if (credentials.geminiApiKey) {
      configs.push({
        provider: 'gemini' as const,
        apiKey: credentials.geminiApiKey,
        model: 'gemini-2.0-flash',
        temperature: 0.7,
        maxTokens: 1000,
        timeout: services.ai.timeoutMs
      })
    }

    // Add OpenAI config if API key available
    if (credentials.openaiApiKey) {
      configs.push({
        provider: 'openai' as const,
        apiKey: credentials.openaiApiKey,
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 1000,
        timeout: services.ai.timeoutMs
      })
    }

    // Add Anthropic config if API key available
    if (credentials.anthropicApiKey) {
      configs.push({
        provider: 'anthropic' as const,
        apiKey: credentials.anthropicApiKey,
        model: 'claude-3-sonnet',
        temperature: 0.7,
        maxTokens: 1000,
        timeout: services.ai.timeoutMs
      })
    }

    // Add local providers (no API key needed)
    configs.push({
      provider: 'local-ollama' as const,
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: services.ai.timeoutMs
    })

    configs.push({
      provider: 'local-lm-studio' as const,
      baseUrl: 'http://localhost:1234',
      model: 'local-model',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: services.ai.timeoutMs
    })

    return configs
  }

  /**
   * Private method: Create integrated service configuration
   */
  private createIntegratedConfig(): IntegratedServiceConfig {
    return {
      ai: {
        providers: this.createAIConfigs(),
        defaultProvider: this.config.services.ai.defaultProvider
      },
      vector: {
        dimensions: this.config.services.vector.dimensions,
        metric: 'cosine',
        maxVectors: this.config.services.vector.maxVectors,
        useApproximateSearch: true,
        persistence: {
          enabled: this.config.services.vector.persistence,
          path: this.config.services.vector.persistencePath,
          autoSave: true,
          saveInterval: 60
        }
      },
      treequest: {
        algorithm: this.config.services.treequest.algorithm,
        explorationConstant: this.config.services.treequest.explorationConstant,
        maxTime: this.config.services.treequest.timeLimit * 1000,
        maxSimulations: this.config.services.treequest.maxSimulations,
        adaptiveBranching: {
          enabled: true,
          minBranching: 2,
          maxBranching: 5,
          confidenceThreshold: 0.8
        },
        multiLLM: {
          enabled: this.config.services.treequest.algorithm === 'abmcts-m',
          models: [
            { provider: 'gemini', model: 'gemini-2.0-flash', weight: 0.4 },
            { provider: 'openai', model: 'gpt-4o-mini', weight: 0.3 },
            { provider: 'local-ollama', model: 'llama3.2', weight: 0.3 }
          ]
        }
      },
      integration: {
        autoEmbedding: this.config.integration.autoEmbedding,
        useTreeQuestForComplexQueries: this.config.integration.useTreeQuestForComplexQueries,
        complexityThreshold: this.config.integration.complexityThreshold,
        cache: {
          enabled: this.config.integration.cacheEnabled,
          ttl: this.config.integration.cacheTtl,
          maxSize: this.config.integration.cacheMaxSize
        }
      }
    }
  }

  /**
   * Private method: Merge configurations deeply
   */
  private mergeConfig(
    baseConfig: ServiceManagerConfig, 
    overrides: Partial<ServiceManagerConfig>
  ): ServiceManagerConfig {
    return {
      ...baseConfig,
      ...overrides,
      credentials: {
        ...baseConfig.credentials,
        ...overrides.credentials
      },
      services: {
        ...baseConfig.services,
        ...overrides.services,
        ai: {
          ...baseConfig.services.ai,
          ...overrides.services?.ai
        },
        vector: {
          ...baseConfig.services.vector,
          ...overrides.services?.vector
        },
        treequest: {
          ...baseConfig.services.treequest,
          ...overrides.services?.treequest
        }
      },
      integration: {
        ...baseConfig.integration,
        ...overrides.integration
      }
    }
  }
}

/**
 * Global service manager instance (singleton pattern)
 */
let globalServiceManager: ServiceManager | null = null

/**
 * Get or create global service manager instance
 */
export function getServiceManager(config?: Partial<ServiceManagerConfig>): ServiceManager {
  if (!globalServiceManager) {
    globalServiceManager = new ServiceManager(config)
  }
  return globalServiceManager
}

/**
 * Initialize services with configuration
 */
export async function initializeServices(config?: Partial<ServiceManagerConfig>): Promise<ServiceInitResult> {
  const manager = getServiceManager(config)
  return manager.initialize()
}

/**
 * Get initialized cognitive graph service
 */
export function getCognitiveGraphService(): CognitiveGraphService {
  if (!globalServiceManager) {
    throw new Error('Service manager not created. Call getServiceManager() first.')
  }
  return globalServiceManager.getCognitiveGraphService()
}

/**
 * Shutdown all services
 */
export async function shutdownServices(): Promise<void> {
  if (globalServiceManager) {
    await globalServiceManager.shutdown()
    globalServiceManager = null
  }
}