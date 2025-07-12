/**
 * AI Provider Manager
 * Manages multiple AI provider configurations and allows dynamic switching
 */

import { LLMConfig, LLMProvider } from '@/types/ai'
import { AIService } from './ai-service'

export interface AIProviderConfig {
  providers: LLMConfig[]
  activeProvider: LLMProvider
  defaultProviders: Record<string, LLMProvider>
}

export class AIProviderManager {
  private config: AIProviderConfig
  private aiService: AIService | null = null
  private listeners: Set<(config: AIProviderConfig) => void> = new Set()

  constructor() {
    this.config = this.initializeProviders()
    this.createAIService()
  }

  /**
   * Initialize all available providers based on environment variables
   */
  private initializeProviders(): AIProviderConfig {
    const providers: LLMConfig[] = []
    let activeProvider: LLMProvider = 'local-ollama' // Default fallback

    // Gemini configuration
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (geminiKey) {
      providers.push({
        provider: 'gemini',
        apiKey: geminiKey,
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 4000
      })
      activeProvider = 'gemini' // Prefer cloud providers
    }

    // OpenAI configuration
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (openaiKey) {
      providers.push({
        provider: 'openai',
        apiKey: openaiKey,
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 4000
      })
      if (activeProvider === 'local-ollama') {
        activeProvider = 'openai'
      }
    }

    // Anthropic configuration
    const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (anthropicKey) {
      providers.push({
        provider: 'anthropic',
        apiKey: anthropicKey,
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 4000
      })
      if (activeProvider === 'local-ollama') {
        activeProvider = 'anthropic'
      }
    }

    // Local Ollama configuration (always available)
    providers.push({
      provider: 'local-ollama',
      model: 'qwen3:latest',
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
      maxTokens: 4000
    })

    // Local LM Studio configuration (always available)
    providers.push({
      provider: 'local-lm-studio',
      model: 'local-model',
      baseUrl: 'http://localhost:1234',
      temperature: 0.7,
      maxTokens: 4000
    })

    // Load saved active provider from localStorage
    const savedProvider = localStorage.getItem('cognitive-graph-studio-active-provider')
    if (savedProvider && providers.some(p => p.provider === savedProvider)) {
      activeProvider = savedProvider as LLMProvider
    }

    console.log('🚀 AI Provider Manager initialized with providers:', 
      providers.map(p => p.provider).join(', '))
    console.log('🎯 Active provider:', activeProvider)

    return {
      providers,
      activeProvider,
      defaultProviders: {
        text: activeProvider,
        embedding: providers.some(p => p.provider === 'gemini') ? 'gemini' : 
                  providers.some(p => p.provider === 'openai') ? 'openai' : activeProvider
      }
    }
  }

  /**
   * Create AI service with all configured providers
   */
  private createAIService(): void {
    if (this.config.providers.length > 0) {
      this.aiService = new AIService(this.config.providers, this.config.activeProvider)
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AIProviderConfig {
    return { ...this.config }
  }

  /**
   * Get AI service instance
   */
  getAIService(): AIService | null {
    return this.aiService
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): LLMConfig[] {
    return [...this.config.providers]
  }

  /**
   * Get active provider configuration
   */
  getActiveProvider(): LLMConfig | null {
    return this.config.providers.find(p => p.provider === this.config.activeProvider) || null
  }

  /**
   * Switch active provider
   */
  setActiveProvider(provider: LLMProvider): boolean {
    const providerConfig = this.config.providers.find(p => p.provider === provider)
    if (!providerConfig) {
      console.error(`Provider ${provider} not found`)
      return false
    }

    this.config.activeProvider = provider
    
    // Save to localStorage
    localStorage.setItem('cognitive-graph-studio-active-provider', provider)
    
    // Recreate AI service with new active provider
    this.createAIService()
    
    // Notify listeners
    this.notifyListeners()

    console.log('🔄 Switched to provider:', provider)
    return true
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig(provider: LLMProvider, updates: Partial<LLMConfig>): boolean {
    const index = this.config.providers.findIndex(p => p.provider === provider)
    if (index === -1) {
      console.error(`Provider ${provider} not found`)
      return false
    }

    this.config.providers[index] = { ...this.config.providers[index], ...updates }
    
    // Recreate AI service if this is the active provider
    if (provider === this.config.activeProvider) {
      this.createAIService()
    }
    
    // Notify listeners
    this.notifyListeners()

    console.log('🔧 Updated provider config:', provider, updates)
    return true
  }

  /**
   * Add a new provider configuration
   */
  addProvider(config: LLMConfig): void {
    // Remove existing provider with same name if exists
    this.config.providers = this.config.providers.filter(p => p.provider !== config.provider)
    
    // Add new provider
    this.config.providers.push(config)
    
    // Recreate AI service
    this.createAIService()
    
    // Notify listeners
    this.notifyListeners()

    console.log('➕ Added provider:', config.provider)
  }

  /**
   * Remove a provider
   */
  removeProvider(provider: LLMProvider): boolean {
    if (this.config.providers.length <= 1) {
      console.error('Cannot remove the last provider')
      return false
    }

    const initialLength = this.config.providers.length
    this.config.providers = this.config.providers.filter(p => p.provider !== provider)

    if (this.config.providers.length === initialLength) {
      console.error(`Provider ${provider} not found`)
      return false
    }

    // If we removed the active provider, switch to another one
    if (this.config.activeProvider === provider) {
      this.config.activeProvider = this.config.providers[0].provider
      localStorage.setItem('cognitive-graph-studio-active-provider', this.config.activeProvider)
    }

    // Recreate AI service
    this.createAIService()
    
    // Notify listeners
    this.notifyListeners()

    console.log('➖ Removed provider:', provider)
    return true
  }

  /**
   * Test connection for a specific provider
   */
  async testProvider(provider: LLMProvider): Promise<boolean> {
    if (!this.aiService) {
      return false
    }

    try {
      const result = await this.aiService.testConnection(provider)
      return result.success
    } catch (error) {
      console.error(`Connection test failed for ${provider}:`, error)
      return false
    }
  }

  /**
   * Test all providers
   */
  async testAllProviders(): Promise<Record<LLMProvider, boolean>> {
    const results: Record<string, boolean> = {}
    
    for (const provider of this.config.providers) {
      results[provider.provider] = await this.testProvider(provider.provider)
    }

    return results as Record<LLMProvider, boolean>
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(listener: (config: AIProviderConfig) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config))
  }

  /**
   * Get provider display information
   */
  getProviderDisplayInfo(provider: LLMProvider): {
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

    return info[provider] || { name: provider, type: 'cloud' as const, requiresApiKey: true }
  }
}

// Create singleton instance
export const aiProviderManager = new AIProviderManager()
