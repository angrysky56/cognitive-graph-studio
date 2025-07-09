/**
 * Enhanced AI Service Manager for Cognitive Graph Studio
 * Provides robust AI integration with error handling, retries, and context management
 * 
 * @author MVPArchitect  
 * @version 1.0.0
 * @module AIServiceManager
 */

import { AIProvider, AIRequest, AIResponse } from '@/types/ai'

/**
 * Configuration for AI service behavior
 */
export interface AIServiceConfig {
  retryAttempts: number
  retryDelay: number
  timeout: number
  maxTokens: number
  temperature: number
}

/**
 * Context management for conversation history
 */
export interface ConversationContext {
  id: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
  }>
  metadata: {
    nodeIds: string[]
    graphContext: string
    createdAt: Date
    lastUsed: Date
  }
}

/**
 * Enhanced AI Service Manager with robust error handling and context management
 * Supports multiple AI providers with automatic failover and retry logic
 * 
 * @example
 * ```typescript
 * const aiManager = new AIServiceManager()
 * await aiManager.initializeProviders()
 * const response = await aiManager.generateContent({ 
 *   prompt: "Explain quantum computing",
 *   context: "Previous discussion about physics"
 * })
 * ```
 */
export class AIServiceManager {
  private providers: Map<string, AIProvider> = new Map()
  private activeProvider: string = 'gemini'
  private config: AIServiceConfig
  private conversationHistory: Map<string, ConversationContext> = new Map()
  private isInitialized: boolean = false

  /**
   * Create new AI Service Manager instance
   * @param config - Service configuration options
   */
  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      maxTokens: 2000,
      temperature: 0.7,
      ...config
    }
    this.initializeProviders()
  }

  /**
   * Initialize all AI providers with default configurations
   * @throws {Error} If environment variables are missing for required providers
   */
  private initializeProviders(): void {
    // Gemini API (free tier)
    this.providers.set('gemini', {
      name: 'gemini',
      displayName: 'Google Gemini',
      status: 'available',
      config: {
        apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
        model: 'gemini-1.5-flash-8b',
        baseUrl: 'https://generativelanguage.googleapis.com'
      }
    })

    // LM Studio (local)
    this.providers.set('lmstudio', {
      name: 'lmstudio',
      displayName: 'LM Studio',
      status: 'available',
      config: {
        baseUrl: import.meta.env.VITE_LMSTUDIO_BASE_URL || 'http://localhost:1234',
        model: import.meta.env.VITE_LMSTUDIO_MODEL || 'local-model'
      }
    })

    // Ollama (local)
    this.providers.set('ollama', {
      name: 'ollama',
      displayName: 'Ollama',
      status: 'available',
      config: {
        baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
        model: import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b'
      }
    })
  }

  /**
   * Test all providers and update their status
   * @returns Promise resolving to map of provider statuses
   */
  async initializeAndTestProviders(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    
    for (const [name, provider] of this.providers) {
      try {
        const isAvailable = await this.testProvider(name)
        results.set(name, isAvailable)
        
        if (!isAvailable && this.activeProvider === name) {
          // Switch to first available provider
          const availableProvider = Array.from(this.providers.entries())
            .find(([_, p]) => p.status === 'available')
          
          if (availableProvider) {
            this.activeProvider = availableProvider[0]
            console.log(`Switched to available provider: ${this.activeProvider}`)
          }
        }
      } catch (error) {
        console.error(`Failed to test provider ${name}:`, error)
        provider.status = 'error'
        results.set(name, false)
      }
    }

    this.isInitialized = true
    return results
  }

  /**
   * Test individual provider connectivity
   * @param providerName - Name of provider to test
   * @returns Promise resolving to availability status
   */
  async testProvider(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName)
    if (!provider) return false

    try {
      provider.status = 'loading'
      
      switch (providerName) {
        case 'gemini':
          return await this.testGemini(provider)
        case 'lmstudio':
          return await this.testLMStudio(provider)
        case 'ollama':
          return await this.testOllama(provider)
        default:
          provider.status = 'error'
          return false
      }
    } catch (error) {
      console.error(`Error testing ${providerName}:`, error)
      provider.status = 'error'
      return false
    }
  }

  /**
   * Test Gemini API connectivity
   * @param provider - Gemini provider configuration
   * @returns Promise resolving to availability status
   * @private
   */
  private async testGemini(provider: AIProvider): Promise<boolean> {
    if (!provider.config.apiKey) {
      console.warn('Gemini API key not provided')
      provider.status = 'error'
      return false
    }

    try {
      const response = await fetch(`${provider.config.baseUrl}/v1beta/models`, {
        headers: {
          'X-Goog-Api-Key': provider.config.apiKey
        },
        signal: AbortSignal.timeout(this.config.timeout)
      })

      const isAvailable = response.ok
      provider.status = isAvailable ? 'available' : 'error'
      return isAvailable
    } catch (error) {
      provider.status = 'error'
      return false
    }
  }

  /**
   * Test LM Studio connectivity
   * @param provider - LM Studio provider configuration
   * @returns Promise resolving to availability status
   * @private
   */
  private async testLMStudio(provider: AIProvider): Promise<boolean> {
    try {
      const response = await fetch(`${provider.config.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(this.config.timeout)
      })
      
      const isAvailable = response.ok
      provider.status = isAvailable ? 'available' : 'error'
      return isAvailable
    } catch (error) {
      provider.status = 'error'
      return false
    }
  }

  /**
   * Test Ollama connectivity
   * @param provider - Ollama provider configuration  
   * @returns Promise resolving to availability status
   * @private
   */
  private async testOllama(provider: AIProvider): Promise<boolean> {
    try {
      const response = await fetch(`${provider.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(this.config.timeout)
      })
      
      const isAvailable = response.ok
      provider.status = isAvailable ? 'available' : 'error'
      return isAvailable
    } catch (error) {
      provider.status = 'error'
      return false
    }
  }

  /**
   * Generate content using the active AI provider with retry logic
   * @param request - AI generation request
   * @param contextId - Optional conversation context ID
   * @returns Promise resolving to AI response
   * @throws {Error} If all providers fail or request is invalid
   */
  async generateContent(request: AIRequest, contextId?: string): Promise<AIResponse> {
    if (!this.isInitialized) {
      await this.initializeAndTestProviders()
    }

    this.validateRequest(request)

    let lastError: Error | null = null
    
    // Try active provider first, then fallback to others
    const providersToTry = [
      this.activeProvider,
      ...Array.from(this.providers.keys()).filter(name => name !== this.activeProvider)
    ]

    for (const providerName of providersToTry) {
      const provider = this.providers.get(providerName)
      
      if (!provider || provider.status !== 'available') {
        continue
      }

      try {
        const response = await this.generateWithRetry(provider, request, contextId)
        
        // Update conversation context if provided
        if (contextId) {
          this.updateConversationContext(contextId, request.prompt, response.content)
        }
        
        return response
      } catch (error) {
        lastError = error as Error
        console.warn(`Provider ${providerName} failed:`, error)
        provider.status = 'error'
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Generate content with retry logic for a specific provider
   * @param provider - AI provider to use
   * @param request - Generation request
   * @param contextId - Optional conversation context
   * @returns Promise resolving to AI response
   * @private
   */
  private async generateWithRetry(
    provider: AIProvider, 
    request: AIRequest, 
    contextId?: string
  ): Promise<AIResponse> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const startTime = Date.now()
        
        let response: AIResponse
        
        switch (provider.name) {
          case 'gemini':
            response = await this.callGemini(provider, request, contextId)
            break
          case 'lmstudio':
            response = await this.callLMStudio(provider, request, contextId)
            break
          case 'ollama':
            response = await this.callOllama(provider, request, contextId)
            break
          default:
            throw new Error(`Unknown provider: ${provider.name}`)
        }

        response.metadata.responseTime = Date.now() - startTime
        response.metadata.timestamp = new Date()
        
        return response
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt)
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.config.retryAttempts} attempts`)
  }

  /**
   * Call Gemini API with enhanced error handling
   * @param provider - Gemini provider configuration
   * @param request - Generation request
   * @param contextId - Optional conversation context
   * @returns Promise resolving to AI response
   * @private
   */
  private async callGemini(
    provider: AIProvider, 
    request: AIRequest, 
    contextId?: string
  ): Promise<AIResponse> {
    const messages = this.buildMessagesForProvider(request, contextId, 'gemini')
    
    const response = await fetch(
      `${provider.config.baseUrl}/v1beta/models/${provider.config.model}:generateContent`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': provider.config.apiKey
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: request.temperature ?? this.config.temperature,
            maxOutputTokens: request.maxTokens ?? this.config.maxTokens
          }
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Gemini API error (${response.status}): ${errorData}`)
    }

    const data = await response.json()
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API')
    }

    return {
      content: data.candidates[0].content.parts[0].text,
      provider: 'gemini',
      model: provider.config.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      metadata: {
        responseTime: 0,
        timestamp: new Date()
      }
    }
  }

  /**
   * Call LM Studio API with enhanced error handling
   * @param provider - LM Studio provider configuration
   * @param request - Generation request
   * @param contextId - Optional conversation context
   * @returns Promise resolving to AI response
   * @private
   */
  private async callLMStudio(
    provider: AIProvider, 
    request: AIRequest, 
    contextId?: string
  ): Promise<AIResponse> {
    const messages = this.buildMessagesForProvider(request, contextId, 'openai')
    
    const response = await fetch(`${provider.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.config.model,
        messages,
        temperature: request.temperature ?? this.config.temperature,
        max_tokens: request.maxTokens ?? this.config.maxTokens
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`LM Studio API error (${response.status}): ${errorData}`)
    }

    const data = await response.json()
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from LM Studio API')
    }

    return {
      content: data.choices[0].message.content,
      provider: 'lmstudio',
      model: provider.config.model,
      usage: data.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      metadata: {
        responseTime: 0,
        timestamp: new Date()
      }
    }
  }

  /**
   * Call Ollama API with enhanced error handling
   * @param provider - Ollama provider configuration
   * @param request - Generation request  
   * @param contextId - Optional conversation context
   * @returns Promise resolving to AI response
   * @private
   */
  private async callOllama(
    provider: AIProvider, 
    request: AIRequest, 
    contextId?: string
  ): Promise<AIResponse> {
    const prompt = this.buildPromptForProvider(request, contextId)
    
    const response = await fetch(`${provider.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.config.model,
        prompt,
        stream: false,
        options: {
          temperature: request.temperature ?? this.config.temperature,
          num_predict: request.maxTokens ?? this.config.maxTokens
        }
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Ollama API error (${response.status}): ${errorData}`)
    }

    const data = await response.json()
    
    if (!data.response) {
      throw new Error('Invalid response format from Ollama API')
    }

    return {
      content: data.response,
      provider: 'ollama',
      model: provider.config.model,
      metadata: {
        responseTime: 0,
        timestamp: new Date()
      }
    }
  }

  /**
   * Build messages array for different provider formats
   * @param request - Generation request
   * @param contextId - Optional conversation context
   * @param format - Message format ('gemini' or 'openai')
   * @returns Formatted messages array
   * @private
   */
  private buildMessagesForProvider(
    request: AIRequest, 
    contextId: string | undefined, 
    format: 'gemini' | 'openai'
  ): any[] {
    const messages: any[] = []
    
    // Add conversation context if available
    if (contextId) {
      const context = this.conversationHistory.get(contextId)
      if (context) {
        for (const msg of context.messages) {
          if (format === 'gemini') {
            messages.push({
              parts: [{ text: msg.content }],
              role: msg.role === 'assistant' ? 'model' : msg.role
            })
          } else {
            messages.push({
              role: msg.role,
              content: msg.content
            })
          }
        }
      }
    }

    // Add system message if context provided
    if (request.context) {
      if (format === 'gemini') {
        messages.unshift({
          parts: [{ text: request.context }],
          role: 'user'
        })
      } else {
        messages.unshift({
          role: 'system',
          content: request.context
        })
      }
    }

    // Add current prompt
    if (format === 'gemini') {
      messages.push({
        parts: [{ text: request.prompt }],
        role: 'user'
      })
    } else {
      messages.push({
        role: 'user',
        content: request.prompt
      })
    }

    return messages
  }

  /**
   * Build prompt string for Ollama
   * @param request - Generation request
   * @param contextId - Optional conversation context
   * @returns Formatted prompt string
   * @private
   */
  private buildPromptForProvider(request: AIRequest, contextId?: string): string {
    let prompt = ''
    
    // Add conversation context if available
    if (contextId) {
      const context = this.conversationHistory.get(contextId)
      if (context) {
        for (const msg of context.messages) {
          prompt += `${msg.role}: ${msg.content}\n`
        }
      }
    }

    // Add system context if provided
    if (request.context) {
      prompt += `System: ${request.context}\n`
    }

    // Add current prompt
    prompt += `User: ${request.prompt}\nAssistant:`

    return prompt
  }

  /**
   * Create or update conversation context
   * @param contextId - Context identifier
   * @param prompt - User prompt
   * @param response - AI response
   * @param nodeIds - Related graph node IDs
   */
  createConversationContext(
    contextId: string, 
    prompt: string, 
    response: string, 
    nodeIds: string[] = []
  ): void {
    const context: ConversationContext = {
      id: contextId,
      messages: [
        {
          role: 'user',
          content: prompt,
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }
      ],
      metadata: {
        nodeIds,
        graphContext: '',
        createdAt: new Date(),
        lastUsed: new Date()
      }
    }

    this.conversationHistory.set(contextId, context)
  }

  /**
   * Update existing conversation context
   * @param contextId - Context identifier
   * @param prompt - User prompt
   * @param response - AI response
   * @private
   */
  private updateConversationContext(
    contextId: string, 
    prompt: string, 
    response: string
  ): void {
    const context = this.conversationHistory.get(contextId)
    
    if (context) {
      context.messages.push(
        {
          role: 'user',
          content: prompt,
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }
      )
      context.metadata.lastUsed = new Date()
    }
  }

  /**
   * Validate AI request parameters
   * @param request - Request to validate
   * @throws {Error} If request is invalid
   * @private
   */
  private validateRequest(request: AIRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty')
    }

    if (request.maxTokens && (request.maxTokens < 1 || request.maxTokens > 8000)) {
      throw new Error('maxTokens must be between 1 and 8000')
    }

    if (request.temperature && (request.temperature < 0 || request.temperature > 2)) {
      throw new Error('temperature must be between 0 and 2')
    }
  }

  /**
   * Utility delay function for retry logic
   * @param ms - Milliseconds to delay
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Public API methods

  /**
   * Get provider by name
   * @param name - Provider name
   * @returns Provider configuration or undefined
   */
  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  /**
   * Get all available providers
   * @returns Array of all providers
   */
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Set active provider
   * @param name - Provider name to activate
   * @throws {Error} If provider doesn't exist
   */
  setActiveProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not found`)
    }
    this.activeProvider = name
  }

  /**
   * Get current active provider name
   * @returns Active provider name
   */
  getActiveProvider(): string {
    return this.activeProvider
  }

  /**
   * Update provider configuration
   * @param name - Provider name
   * @param config - Configuration updates
   * @throws {Error} If provider doesn't exist
   */
  updateProviderConfig(name: string, config: Partial<AIProvider['config']>): void {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Provider ${name} not found`)
    }
    provider.config = { ...provider.config, ...config }
  }

  /**
   * Get conversation context
   * @param contextId - Context identifier
   * @returns Conversation context or undefined
   */
  getConversationContext(contextId: string): ConversationContext | undefined {
    return this.conversationHistory.get(contextId)
  }

  /**
   * Clear conversation context
   * @param contextId - Context identifier to clear
   * @returns True if context was cleared, false if not found
   */
  clearConversationContext(contextId: string): boolean {
    return this.conversationHistory.delete(contextId)
  }

  /**
   * Get service configuration
   * @returns Current service configuration
   */
  getConfig(): AIServiceConfig {
    return { ...this.config }
  }

  /**
   * Update service configuration
   * @param updates - Configuration updates
   */
  updateConfig(updates: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

/**
 * Create a singleton AI service manager instance
 * @param config - Optional service configuration
 * @returns Configured AI service manager
 */
export function createAIServiceManager(config?: Partial<AIServiceConfig>): AIServiceManager {
  return new AIServiceManager(config)
}

/**
 * Default AI service manager instance
 */
export const aiService = new AIServiceManager()
export default aiService
