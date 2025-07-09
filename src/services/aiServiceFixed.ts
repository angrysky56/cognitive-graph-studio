/**
 * Fixed AI Service Integration for Cognitive Graph Studio
 * Resolves: Gemini API endpoints, error handling, connection stability
 * 
 * @fileoverview Enhanced AI service manager supporting Gemini 2.0 Flash, LM Studio, and Ollama
 * with proper error handling, connection testing, and robust API integration
 */

import { AIProvider, AIRequest, AIResponse } from '@/types/ai'

/**
 * Enhanced AI service configuration interface
 */
interface AIServiceConfig {
  retryAttempts: number
  timeoutMs: number
  rateLimitDelay: number
}

/**
 * Connection test result interface
 */
interface ConnectionTestResult {
  success: boolean
  latency: number
  error?: string
  models?: string[]
}

/**
 * Enhanced AI Service Manager with robust error handling and connection management
 */
class AIServiceManagerFixed {
  private providers: Map<string, AIProvider> = new Map()
  private activeProvider: string = 'gemini'
  private config: AIServiceConfig
  private connectionStatus: Map<string, ConnectionTestResult> = new Map()
  private lastHealthCheck: Map<string, Date> = new Map()

  constructor() {
    this.config = {
      retryAttempts: 3,
      timeoutMs: 30000, // 30 seconds
      rateLimitDelay: 1000 // 1 second between requests
    }
    
    this.initializeProviders()
    this.performInitialHealthChecks()
  }

  /**
   * Initialize all AI providers with proper configuration validation
   */
  private initializeProviders(): void {
    // Load and validate environment variables
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY
    const lmstudioBaseUrl = import.meta.env.VITE_LMSTUDIO_BASE_URL || 'http://localhost:1234'
    const lmstudioModel = import.meta.env.VITE_LMSTUDIO_MODEL || 'local-model'
    const ollamaBaseUrl = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'
    const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL || 'qwen2.5:latest'

    // Gemini 2.0 Flash (updated endpoint and model)
    this.providers.set('gemini', {
      name: 'gemini',
      displayName: 'Google Gemini 2.0 Flash',
      status: geminiApiKey ? 'available' : 'error',
      config: {
        apiKey: geminiApiKey || '',
        model: 'gemini-2.0-flash-exp', // Latest model
        baseUrl: 'https://generativelanguage.googleapis.com'
      }
    })

    // LM Studio (local server)
    this.providers.set('lmstudio', {
      name: 'lmstudio',
      displayName: 'LM Studio (Local)',
      status: 'available',
      config: {
        baseUrl: lmstudioBaseUrl,
        model: lmstudioModel,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    })

    // Ollama (local server)
    this.providers.set('ollama', {
      name: 'ollama',
      displayName: 'Ollama (Local)',
      status: 'available',
      config: {
        baseUrl: ollamaBaseUrl,
        model: ollamaModel,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    })

    console.log('🤖 AI Service initialized with configuration:', {
      geminiConfigured: !!geminiApiKey,
      geminiModel: 'gemini-2.0-flash-exp',
      lmstudioUrl: lmstudioBaseUrl,
      ollamaUrl: ollamaBaseUrl,
      providersCount: this.providers.size
    })
  }

  /**
   * Perform initial health checks on all providers
   */
  private async performInitialHealthChecks(): Promise<void> {
    console.log('🔍 Performing initial AI provider health checks...')
    
    const healthCheckPromises = Array.from(this.providers.keys()).map(async (providerName) => {
      try {
        const result = await this.testProviderConnection(providerName)
        this.connectionStatus.set(providerName, result)
        this.lastHealthCheck.set(providerName, new Date())
        
        const provider = this.providers.get(providerName)!
        provider.status = result.success ? 'available' : 'error'
        
        console.log(`${result.success ? '✅' : '❌'} ${providerName}: ${result.success ? `OK (${result.latency}ms)` : result.error}`)
      } catch (error) {
        console.error(`❌ Health check failed for ${providerName}:`, error)
        this.connectionStatus.set(providerName, {
          success: false,
          latency: 0,
          error: (error as Error).message
        })
      }
    })

    await Promise.allSettled(healthCheckPromises)
    
    // Set the first available provider as active
    const availableProvider = Array.from(this.providers.entries())
      .find(([_, provider]) => provider.status === 'available')
    
    if (availableProvider) {
      this.activeProvider = availableProvider[0]
      console.log(`🎯 Active provider set to: ${availableProvider[1].displayName}`)
    } else {
      console.warn('⚠️ No AI providers are currently available')
    }
  }

  /**
   * Test connection to a specific provider with detailed diagnostics
   */
  async testProviderConnection(providerName: string): Promise<ConnectionTestResult> {
    const provider = this.providers.get(providerName)
    if (!provider) {
      return {
        success: false,
        latency: 0,
        error: 'Provider not found'
      }
    }

    const startTime = Date.now()

    try {
      switch (providerName) {
        case 'gemini':
          return await this.testGeminiConnection(provider, startTime)
        case 'lmstudio':
          return await this.testLMStudioConnection(provider, startTime)
        case 'ollama':
          return await this.testOllamaConnection(provider, startTime)
        default:
          return {
            success: false,
            latency: 0,
            error: 'Unknown provider type'
          }
      }
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: (error as Error).message
      }
    }
  }

  /**
   * Test Gemini API connection with proper v1 endpoint
   */
  private async testGeminiConnection(provider: AIProvider, startTime: number): Promise<ConnectionTestResult> {
    if (!provider.config.apiKey) {
      return {
        success: false,
        latency: 0,
        error: 'API key not configured'
      }
    }

    // Use the correct v1 endpoint for listing models
    const response = await this.fetchWithTimeout(
      `${provider.config.baseUrl}/v1/models`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': provider.config.apiKey,
          'Content-Type': 'application/json'
        }
      },
      this.config.timeoutMs
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const models = data.models?.map((m: any) => m.name) || []

    return {
      success: true,
      latency: Date.now() - startTime,
      models
    }
  }

  /**
   * Test LM Studio connection
   */
  private async testLMStudioConnection(provider: AIProvider, startTime: number): Promise<ConnectionTestResult> {
    const response = await this.fetchWithTimeout(
      `${provider.config.baseUrl}/v1/models`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      this.config.timeoutMs
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const models = data.data?.map((m: any) => m.id) || []

    return {
      success: true,
      latency: Date.now() - startTime,
      models
    }
  }

  /**
   * Test Ollama connection
   */
  private async testOllamaConnection(provider: AIProvider, startTime: number): Promise<ConnectionTestResult> {
    const response = await this.fetchWithTimeout(
      `${provider.config.baseUrl}/api/tags`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      this.config.timeoutMs
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const models = data.models?.map((m: any) => m.name) || []

    return {
      success: true,
      latency: Date.now() - startTime,
      models
    }
  }

  /**
   * Fetch with timeout and proper error handling
   */
  private async fetchWithTimeout(
    url: string, 
    options: RequestInit, 
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`)
      }
      throw error
    }
  }

  /**
   * Enhanced content generation with retry logic and proper error handling
   */
  async generateContent(request: AIRequest): Promise<AIResponse> {
    const provider = this.providers.get(this.activeProvider)
    if (!provider || provider.status !== 'available') {
      throw new Error(`Provider ${this.activeProvider} not available`)
    }

    const startTime = Date.now()
    let lastError: Error | null = null

    // Retry logic for robust generation
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`🤖 Generating content with ${provider.displayName} (attempt ${attempt}/${this.config.retryAttempts})`)
        
        let response: AIResponse

        switch (this.activeProvider) {
          case 'gemini':
            response = await this.callGeminiFixed(provider, request)
            break
          case 'lmstudio':
            response = await this.callLMStudioFixed(provider, request)
            break
          case 'ollama':
            response = await this.callOllamaFixed(provider, request)
            break
          default:
            throw new Error(`Unknown provider: ${this.activeProvider}`)
        }

        response.metadata.responseTime = Date.now() - startTime
        response.metadata.timestamp = new Date()
        response.metadata.attempt = attempt

        console.log(`✅ Content generated successfully in ${response.metadata.responseTime}ms`)
        return response

      } catch (error) {
        lastError = error as Error
        console.warn(`⚠️ Attempt ${attempt} failed:`, lastError.message)
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.rateLimitDelay * attempt) // Exponential backoff
        }
      }
    }

    throw new Error(`AI generation failed after ${this.config.retryAttempts} attempts. Last error: ${lastError?.message}`)
  }

  /**
   * Fixed Gemini API call with proper v1 endpoint
   */
  private async callGeminiFixed(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const url = `${provider.config.baseUrl}/v1beta/models/${provider.config.model}:generateContent`
    
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': provider.config.apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: request.context ? `Context: ${request.context}\n\nQuery: ${request.prompt}` : request.prompt
          }]
        }],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 1000,
          topP: 0.8,
          topK: 40
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    }, this.config.timeoutMs)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Gemini API error ${response.status}: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No content generated by Gemini')
    }

    const content = data.candidates[0]?.content?.parts[0]?.text || ''
    if (!content) {
      throw new Error('Empty response from Gemini')
    }

    return {
      content,
      provider: 'gemini',
      model: provider.config.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      metadata: {
        responseTime: 0, // Will be set by caller
        timestamp: new Date(),
        finishReason: data.candidates[0]?.finishReason
      }
    }
  }

  /**
   * Fixed LM Studio API call
   */
  private async callLMStudioFixed(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const response = await this.fetchWithTimeout(`${provider.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.config.model,
        messages: [
          ...(request.context ? [{ role: 'system', content: request.context }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1000,
        stream: false
      })
    }, this.config.timeoutMs)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`LM Studio API error ${response.status}: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    if (!content) {
      throw new Error('Empty response from LM Studio')
    }

    return {
      content,
      provider: 'lmstudio',
      model: provider.config.model,
      usage: data.usage || {},
      metadata: {
        responseTime: 0,
        timestamp: new Date(),
        finishReason: data.choices?.[0]?.finish_reason
      }
    }
  }

  /**
   * Fixed Ollama API call
   */
  private async callOllamaFixed(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const prompt = request.context 
      ? `Context: ${request.context}\n\nQuery: ${request.prompt}`
      : request.prompt

    const response = await this.fetchWithTimeout(`${provider.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.config.model,
        prompt,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 1000
        }
      })
    }, this.config.timeoutMs)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Ollama API error ${response.status}: ${errorData.error || response.statusText}`)
    }

    const data = await response.json()
    const content = data.response || ''
    
    if (!content) {
      throw new Error('Empty response from Ollama')
    }

    return {
      content,
      provider: 'ollama',
      model: provider.config.model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      metadata: {
        responseTime: 0,
        timestamp: new Date(),
        evalDuration: data.eval_duration
      }
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Public API methods
   */

  /**
   * Test provider connectivity
   */
  async testProvider(providerName: string): Promise<boolean> {
    const result = await this.testProviderConnection(providerName)
    return result.success
  }

  /**
   * Get provider information
   */
  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  /**
   * Get all providers
   */
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Get connection status for all providers
   */
  getConnectionStatus(): Map<string, ConnectionTestResult> {
    return new Map(this.connectionStatus)
  }

  /**
   * Switch active provider
   */
  setActiveProvider(name: string): boolean {
    const provider = this.providers.get(name)
    if (provider && provider.status === 'available') {
      this.activeProvider = name
      console.log(`🔄 Switched to provider: ${provider.displayName}`)
      return true
    }
    return false
  }

  /**
   * Get current active provider
   */
  getActiveProvider(): string {
    return this.activeProvider
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig(name: string, config: Partial<AIProvider['config']>): void {
    const provider = this.providers.get(name)
    if (provider) {
      provider.config = { ...provider.config, ...config }
      console.log(`🔧 Updated configuration for ${provider.displayName}`)
    }
  }

  /**
   * Refresh connection status for all providers
   */
  async refreshConnections(): Promise<void> {
    console.log('🔄 Refreshing all provider connections...')
    await this.performInitialHealthChecks()
  }
}

// Export enhanced singleton instance
export const aiServiceFixed = new AIServiceManagerFixed()
export default aiServiceFixed