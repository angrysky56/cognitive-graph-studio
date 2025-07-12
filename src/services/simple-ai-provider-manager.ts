/**
 * Simplified AI Provider Manager
 * Manages single active provider with easy switching
 */

import { LLMConfig, LLMProvider } from '@/types/ai'
import { AIService } from './ai-service'

export interface ProviderStatus {
  connected: boolean
  models: string[]
  lastTested: Date | null
  error?: string
}

export class SimpleAIProviderManager {
  private activeConfig: LLMConfig | null = null
  private aiService: AIService | null = null
  private availableProviders: LLMProvider[] = ['gemini', 'openai', 'anthropic', 'local-ollama', 'local-lm-studio']
  private providerStatus: Map<LLMProvider, ProviderStatus> = new Map()
  private listeners: Set<(config: LLMConfig | null) => void> = new Set()

  constructor() {
    this.initialize()
  }

  /**
   * Initialize with the best available provider
   */
  private initialize(): void {
    console.log('🔧 Initializing Simple AI Provider Manager...')
    
    // Try providers in order of preference
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY
    const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY

    console.log('🔑 Environment Check:')
    console.log('- Gemini:', geminiKey ? '✅ Present' : '❌ Missing')
    console.log('- OpenAI:', openaiKey ? '✅ Present' : '❌ Missing')
    console.log('- Anthropic:', anthropicKey ? '✅ Present' : '❌ Missing')

    let config: LLMConfig | null = null

    if (geminiKey) {
      config = {
        provider: 'gemini',
        apiKey: geminiKey,
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 4000
      }
    } else if (openaiKey) {
      config = {
        provider: 'openai',
        apiKey: openaiKey,
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 4000
      }
    } else if (anthropicKey) {
      config = {
        provider: 'anthropic',
        apiKey: anthropicKey,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 4000
      }
    } else {
      // Fallback to local Ollama
      config = {
        provider: 'local-ollama',
        model: 'qwen3:latest',
        baseUrl: 'http://localhost:11434',
        temperature: 0.7,
        maxTokens: 4000
      }
    }

    // Load saved provider from localStorage
    const savedProvider = localStorage.getItem('cognitive-graph-studio-active-provider')
    const savedConfig = localStorage.getItem('cognitive-graph-studio-active-config')
    
    if (savedProvider && savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        if (this.isValidProvider(parsed.provider)) {
          config = parsed
          console.log('📁 Loaded saved provider:', savedProvider)
        }
      } catch (error) {
        console.warn('Failed to load saved provider config:', error)
      }
    }

    if (config) {
      this.setActiveProvider(config)
    }

    console.log('🚀 Simple AI Provider Manager initialized with:', config?.provider)
  }

  /**
   * Get current active configuration
   */
  getActiveConfig(): LLMConfig | null {
    return this.activeConfig
  }

  /**
   * Get AI service instance
   */
  getAIService(): AIService | null {
    return this.aiService
  }

  /**
   * Get available provider types
   */
  getAvailableProviders(): LLMProvider[] {
    return [...this.availableProviders]
  }

  /**
   * Get provider status
   */
  getProviderStatus(provider: LLMProvider): ProviderStatus | null {
    return this.providerStatus.get(provider) || null
  }

  /**
   * Set active provider with new configuration
   */
  async setActiveProvider(config: LLMConfig): Promise<boolean> {
    try {
      // Create new AI service with this provider
      this.aiService = new AIService([config], config.provider)
      this.activeConfig = config

      // Save to localStorage
      localStorage.setItem('cognitive-graph-studio-active-provider', config.provider)
      localStorage.setItem('cognitive-graph-studio-active-config', JSON.stringify(config))

      // Test the provider and fetch models
      await this.updateProviderStatus(config.provider)

      // Notify listeners
      this.notifyListeners()

      console.log('✅ Switched to provider:', config.provider)
      return true
    } catch (error) {
      console.error('❌ Failed to switch provider:', error)
      return false
    }
  }

  /**
   * Update provider status and fetch models
   */
  async updateProviderStatus(provider: LLMProvider): Promise<void> {
    if (!this.aiService || !this.activeConfig || this.activeConfig.provider !== provider) {
      console.warn('❌ Cannot update status - no service or wrong provider')
      return
    }

    console.log('🔍 Testing provider:', provider)

    const status: ProviderStatus = {
      connected: false,
      models: [],
      lastTested: new Date(),
      error: undefined
    }

    try {
      // Test connection
      console.log('🌐 Testing connection...')
      const testResult = await this.aiService.testConnection(provider)
      status.connected = testResult.success
      
      if (!testResult.success) {
        status.error = testResult.error
        console.log('❌ Connection failed:', testResult.error)
      } else {
        console.log('✅ Connection successful')
      }

      // Fetch models if connected
      if (status.connected) {
        console.log('📋 Fetching models...')
        status.models = await this.aiService.getAvailableModels(provider)
        console.log('✅ Models fetched:', status.models.length)
      }
    } catch (error) {
      status.connected = false
      status.error = (error as Error).message
      console.error('❌ Provider test failed:', error)
    }

    this.providerStatus.set(provider, status)
    console.log('📊 Provider status updated:', provider, status.connected ? 'connected' : 'failed')
  }

  /**
   * Test provider connection
   */
  async testProvider(provider: LLMProvider): Promise<boolean> {
    if (!this.aiService || !this.activeConfig || this.activeConfig.provider !== provider) {
      return false
    }

    try {
      const result = await this.aiService.testConnection(provider)
      await this.updateProviderStatus(provider)
      return result.success
    } catch (error) {
      console.error(`Connection test failed for ${provider}:`, error)
      return false
    }
  }

  /**
   * Get models for the active provider
   */
  async getAvailableModels(): Promise<string[]> {
    if (!this.aiService || !this.activeConfig) {
      console.warn('❌ No AI service or config available for model fetching')
      return []
    }

    try {
      console.log('🔍 Fetching models for provider:', this.activeConfig.provider)
      const models = await this.aiService.getAvailableModels(this.activeConfig.provider)
      console.log('✅ Models fetched:', models.length, 'models found')
      console.log('📋 Models:', models.slice(0, 5), models.length > 5 ? '...' : '')
      return models
    } catch (error) {
      console.error('❌ Failed to fetch models:', error)
      return []
    }
  }

  /**
   * Update model for current provider
   */
  updateModel(model: string): boolean {
    if (!this.activeConfig) {
      return false
    }

    this.activeConfig.model = model
    localStorage.setItem('cognitive-graph-studio-active-config', JSON.stringify(this.activeConfig))
    
    // Recreate AI service with updated config
    this.aiService = new AIService([this.activeConfig], this.activeConfig.provider)
    
    this.notifyListeners()
    return true
  }

  /**
   * Check if provider type is valid
   */
  private isValidProvider(provider: string): provider is LLMProvider {
    return this.availableProviders.includes(provider as LLMProvider)
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(listener: (config: LLMConfig | null) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.activeConfig))
  }

  /**
   * Get provider display info
   */
  getProviderInfo(provider: LLMProvider): {
    name: string
    type: 'cloud' | 'local'
    requiresApiKey: boolean
    defaultBaseUrl?: string
  } {
    const info = {
      gemini: { name: 'Google Gemini', type: 'cloud' as const, requiresApiKey: true },
      openai: { name: 'OpenAI', type: 'cloud' as const, requiresApiKey: true },
      anthropic: { name: 'Anthropic Claude', type: 'cloud' as const, requiresApiKey: true },
      'local-ollama': { 
        name: 'Ollama (Local)', 
        type: 'local' as const, 
        requiresApiKey: false,
        defaultBaseUrl: 'http://localhost:11434'
      },
      'local-lm-studio': { 
        name: 'LM Studio (Local)', 
        type: 'local' as const, 
        requiresApiKey: false,
        defaultBaseUrl: 'http://localhost:1234'
      }
    }

    return info[provider]
  }

  /**
   * Create provider configuration with defaults
   */
  createProviderConfig(provider: LLMProvider): LLMConfig {
    const info = this.getProviderInfo(provider)
    const apiKey = this.getApiKeyForProvider(provider)

    const defaultModels = {
      gemini: 'gemini-1.5-flash',
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-5-sonnet-20241022',
      'local-ollama': 'qwen3:latest',
      'local-lm-studio': 'local-model'
    }

    return {
      provider,
      apiKey: info.requiresApiKey ? apiKey : undefined,
      baseUrl: info.defaultBaseUrl,
      model: defaultModels[provider],
      temperature: 0.7,
      maxTokens: 4000
    }
  }

  /**
   * Get API key from environment for provider
   */
  private getApiKeyForProvider(provider: LLMProvider): string {
    switch (provider) {
      case 'gemini':
        return import.meta.env.VITE_GEMINI_API_KEY || ''
      case 'openai':
        return import.meta.env.VITE_OPENAI_API_KEY || ''
      case 'anthropic':
        return import.meta.env.VITE_ANTHROPIC_API_KEY || ''
      default:
        return ''
    }
  }
}

// Create singleton instance
export const simpleAIProviderManager = new SimpleAIProviderManager()
