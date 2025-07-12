/**
 * @fileoverview Enhanced AI service manager supporting Gemini, OpenAI, Anthropic, and local models
 * with robust error handling, connection testing, and a unified interface for graph operations.
 * @module AIService
 */

import {
  LLMProvider,
  LLMConfig,
  LLMRequest,
  LLMResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  IAIService,
  ConnectionTestResult,
} from '@/types/ai'

// Re-export types for backward compatibility
export type {
  LLMProvider,
  LLMConfig,
  LLMRequest,
  LLMResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  IAIService,
  ConnectionTestResult,
}

/**
 * Enhanced AI service configuration interface
 */
interface AIServiceConfig {
  retryAttempts: number
  timeoutMs: number
  rateLimitDelay: number
}

/**
 * AI service implementation with multi-provider support, robust error handling, and connection management.
 * Handles connection management, request routing, and response normalization across different LLM providers.
 */
export class AIService implements IAIService {
  private providers: Map<LLMProvider, LLMConfig> = new Map()
  private activeProvider: LLMProvider = 'gemini'
  private embeddingCache: Map<string, EmbeddingResponse> = new Map()
  private config: AIServiceConfig
  private connectionStatus: Map<LLMProvider, ConnectionTestResult> = new Map()

  /**
   * Initialize AI service with provider configurations and performs initial health checks.
   * @param configs - Array of LLM provider configurations
   * @param defaultProvider - Default provider for requests
   */
  constructor(configs: LLMConfig[], defaultProvider?: LLMProvider) {
    this.config = {
      retryAttempts: 3,
      timeoutMs: 30000, // 30 seconds
      rateLimitDelay: 1000, // 1 second between requests
    }

    configs.forEach(config => {
      this.providers.set(config.provider, config)
    })

    if (defaultProvider) {
      this.activeProvider = defaultProvider
    }

    this.performInitialHealthChecks()
  }

  /**
   * Perform initial health checks on all configured providers.
   */
  private async performInitialHealthChecks(): Promise<void> {
    console.log('🔍 Performing initial AI provider health checks...')
    const healthCheckPromises = Array.from(this.providers.keys()).map(async providerName => {
      try {
        const result = await this.testConnection(providerName)
        this.connectionStatus.set(providerName, result)
        console.log(
          `${result.success ? '✅' : '❌'} ${providerName}: ${
            result.success ? `OK (${result.latency}ms)` : result.error
          }`
        )
      } catch (error) {
        console.error(`❌ Health check failed for ${providerName}:`, error)
        this.connectionStatus.set(providerName, {
          success: false,
          latency: 0,
          error: (error as Error).message,
        })
      }
    })

    await Promise.allSettled(healthCheckPromises)
  }

  /**
   * Generate text completion with retry logic and detailed error handling.
   */
  async generateText(request: LLMRequest, config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const provider = config?.provider ?? this.activeProvider
    const providerConfig = this.providers.get(provider)

    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`)
    }

    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(
          `🤖 Generating content with ${provider} (attempt ${attempt}/${this.config.retryAttempts})`
        )
        let response: LLMResponse

        switch (provider) {
          case 'gemini':
            response = await this.generateGeminiText(request, providerConfig)
            break
          case 'openai':
            response = await this.generateOpenAIText(request, providerConfig)
            break
          case 'anthropic':
            response = await this.generateAnthropicText(request, providerConfig)
            break
          case 'local-ollama':
            response = await this.generateOllamaText(request, providerConfig)
            break
          case 'local-lm-studio':
            response = await this.generateLMStudioText(request, providerConfig)
            break
          default:
            throw new Error(`Unsupported provider: ${provider}`)
        }

        response.metadata.latency = Date.now() - startTime
        console.log(`✅ Content generated successfully in ${response.metadata.latency}ms`)
        return response
      } catch (error) {
        lastError = error as Error
        console.warn(`⚠️ Attempt ${attempt} failed:`, lastError.message)
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.rateLimitDelay * attempt) // Exponential backoff
        }
      }
    }

    throw new Error(
      `AI generation failed after ${this.config.retryAttempts} attempts. Last error: ${lastError?.message}`
    )
  }

  /**
   * Generate embeddings with caching for performance.
   */
  async generateEmbedding(
    request: EmbeddingRequest,
    config?: Partial<LLMConfig>
  ): Promise<EmbeddingResponse> {
    const cacheKey = `${request.text}:${request.model ?? 'default'}`
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!
    }

    const provider = config?.provider ?? this.activeProvider
    const providerConfig = this.providers.get(provider)
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`)
    }

    let response: EmbeddingResponse
    switch (provider) {
      case 'gemini':
        response = await this.generateGeminiEmbedding(request, providerConfig)
        break
      case 'openai':
        response = await this.generateOpenAIEmbedding(request, providerConfig)
        break
      default:
        throw new Error(`Embedding not supported for provider: ${provider}`)
    }

    this.embeddingCache.set(cacheKey, response)
    return response
  }

  /**
   * Test connection to a specific provider with detailed diagnostics.
   */
  async testConnection(providerName: LLMProvider): Promise<ConnectionTestResult> {
    const provider = this.providers.get(providerName)
    if (!provider) {
      return { success: false, latency: 0, error: 'Provider not found' }
    }

    const startTime = Date.now()
    try {
      switch (providerName) {
        case 'gemini':
          return await this.testGeminiConnection(provider, startTime)
        // Add other provider tests here
        default:
          // Fallback for other providers
          await this.generateText({ prompt: 'test', maxTokens: 1 }, { provider: providerName })
          return { success: true, latency: Date.now() - startTime }
      }
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Test Gemini API connection using the v1 endpoint.
   */
  private async testGeminiConnection(
    provider: LLMConfig,
    startTime: number
  ): Promise<ConnectionTestResult> {
    if (!provider.apiKey) {
      return { success: false, latency: 0, error: 'API key not configured' }
    }

    const response = await this.fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1/models?key=${provider.apiKey}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      this.config.timeoutMs
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const models = data.models?.map((m: any) => m.name) || []
    return { success: true, latency: Date.now() - startTime, models }
  }

  /**
   * Get available models for a given provider.
   */
  async getAvailableModels(provider: LLMProvider): Promise<string[]> {
    const providerConfig = this.providers.get(provider)
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`)
    }

    switch (provider) {
      case 'gemini':
        return ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-pro']
      case 'openai':
        return ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
      case 'anthropic':
        return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
      case 'local-ollama':
        return this.getOllamaModels(providerConfig)
      case 'local-lm-studio':
        return this.getLMStudioModels(providerConfig)
      default:
        return []
    }
  }

  /**
   * Calculate semantic similarity between two texts using embeddings.
   */
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    const [embedding1, embedding2] = await Promise.all([
      this.generateEmbedding({ text: text1 }),
      this.generateEmbedding({ text: text2 }),
    ])
    return this.cosineSimilarity(embedding1.embedding, embedding2.embedding)
  }

  /**
   * UI Helper: Process user query for graph analysis
   */
  async processUserQuery(query: string, config?: Partial<LLMConfig>): Promise<LLMResponse> {
    return this.generateText({
      prompt: query,
      systemPrompt: "You are a helpful assistant for knowledge graph analysis. Provide clear, actionable insights based on the user's question.",
      temperature: 0.7,
      maxTokens: 8164
    }, config)
  }

  /**
   * UI Helper: Generate node summary from content
   */
  async generateNodeSummary(content: string, config?: Partial<LLMConfig>): Promise<string> {
    const response = await this.generateText({
      prompt: `Summarize this content in 2-3 sentences, focusing on the key concepts and main ideas:\n\n${content}`,
      temperature: 0.3,
      maxTokens: 1000
    }, config)

    return response.content
  }

  /**
   * UI Helper: Extract key terms from text
   */
  async extractKeyTerms(text: string, maxTerms: number = 10, config?: Partial<LLMConfig>): Promise<string[]> {
    const response = await this.generateText({
      prompt: `Extract the ${maxTerms} most important key terms and concepts from this text. Return as a JSON array of strings:\n\n${text}`,
      format: 'json',
      temperature: 0.2,
      maxTokens: 8164
    }, config)

    try {
      const terms = JSON.parse(response.content)
      return Array.isArray(terms) ? terms.slice(0, maxTerms) : []
    } catch {
      // Fallback: extract terms manually
      return text.split(/[,.\n]/)
        .map(term => term.trim())
        .filter(term => term.length > 2)
        .slice(0, maxTerms)
    }
  }

  /**
   * UI Helper: Suggest relationship between two nodes
   */
  async suggestRelationship(
    sourceLabel: string,
    sourceContent: string,
    targetLabel: string,
    targetContent: string,
    config?: Partial<LLMConfig>
  ): Promise<{
    type: 'semantic' | 'causal' | 'temporal' | 'hierarchical'
    strength: number
    reasoning: string
  }> {
    const response = await this.generateText({
      prompt: `Analyze the relationship between these two concepts:\n\nConcept A: "${sourceLabel}"\nContent: ${sourceContent}\n\nConcept B: "${targetLabel}"\nContent: ${targetContent}\n\nDetermine:\n1. Relationship type (semantic, causal, temporal, hierarchical)\n2. Strength (0-1, where 1 is very strong relationship)\n3. Brief reasoning\n\nFormat as JSON: {"type": "...", "strength": 0.0, "reasoning": "..."}`,
      format: 'json',
      temperature: 0.3,
      maxTokens: 8164
    }, config)

    try {
      const result = JSON.parse(response.content)
      return {
        type: result.type || 'semantic',
        strength: Math.max(0, Math.min(1, result.strength || 0.5)),
        reasoning: result.reasoning || 'AI-suggested relationship'
      }
    } catch {
      return {
        type: 'semantic',
        strength: 0.5,
        reasoning: 'Could not determine specific relationship type'
      }
    }
  }

  /**
   * Fetch with timeout and abort signal.
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, { ...options, signal: controller.signal })
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
   * Utility function for delays (e.g., for rate limiting).
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Private method: Generate text using the corrected Gemini API v1beta endpoint.
   */
  private async generateGeminiText(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`
    const response = await this.fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature: request.temperature ?? config.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? config.maxTokens ?? 2048,
            responseMimeType: request.format === 'json' ? 'application/json' : 'text/plain',
          },
        }),
      },
      this.config.timeoutMs
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Gemini API error ${response.status}: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No content generated by Gemini')
    }
    const content = data.candidates[0]?.content?.parts[0]?.text || ''

    return {
      content,
      metadata: {
        model: config.model,
        provider: 'gemini',
        tokens: {
          input: data.usageMetadata?.promptTokenCount ?? 0,
          output: data.usageMetadata?.candidatesTokenCount ?? 0,
          total: data.usageMetadata?.totalTokenCount ?? 0,
        },
        latency: 0, // Will be set by the caller
      },
    }
  }

  /**
   * Private method: Generate text using OpenAI API
   */
  private async generateOpenAIText(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? config.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? config.maxTokens ?? 1000,
        response_format: request.format === 'json' ? { type: 'json_object' } : undefined
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message ?? 'Unknown error'}`)
    }

    return {
      content: data.choices[0].message.content,
      metadata: {
        model: config.model,
        provider: 'openai',
        tokens: {
          input: data.usage?.prompt_tokens ?? 0,
          output: data.usage?.completion_tokens ?? 0,
          total: data.usage?.total_tokens ?? 0
        },
        latency: 0
      }
    }
  }

  /**
   * Private method: Generate text using Anthropic API
   */
  private async generateAnthropicText(_request: LLMRequest, _config: LLMConfig): Promise<LLMResponse> {
    // Implementation for Anthropic API
    throw new Error('Anthropic implementation pending')
  }

  /**
   * Private method: Generate text using Ollama local server
   */
  private async generateOllamaText(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
    const baseUrl = config.baseUrl ?? 'http://localhost:11434'

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: request.prompt,
        stream: false,
        options: {
          temperature: request.temperature ?? config.temperature ?? 0.7,
          num_predict: request.maxTokens ?? config.maxTokens ?? 1000
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Ollama API error: ${data.error ?? 'Unknown error'}`)
    }

    return {
      content: data.response,
      metadata: {
        model: config.model,
        provider: 'local-ollama',
        tokens: {
          input: data.prompt_eval_count ?? 0,
          output: data.eval_count ?? 0,
          total: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0)
        },
        latency: 0
      }
    }
  }

  /**
   * Private method: Generate text using LM Studio local server
   */
  private async generateLMStudioText(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
    const baseUrl = config.baseUrl ?? 'http://localhost:1234'

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature ?? config.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? config.maxTokens ?? 1000
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${data.error?.message ?? 'Unknown error'}`)
    }

    return {
      content: data.choices[0].message.content,
      metadata: {
        model: config.model,
        provider: 'local-lm-studio',
        tokens: {
          input: data.usage?.prompt_tokens ?? 0,
          output: data.usage?.completion_tokens ?? 0,
          total: data.usage?.total_tokens ?? 0
        },
        latency: 0
      }
    }
  }

  /**
   * Private method: Generate embeddings using Gemini API
   */
  private async generateGeminiEmbedding(request: EmbeddingRequest, config: LLMConfig): Promise<EmbeddingResponse> {
    const model = request.model ?? 'models/text-embedding-004'

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${config.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: request.text }] }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Gemini Embedding API error: ${data.error?.message ?? 'Unknown error'}`)
    }

    return {
      embedding: data.embedding.values,
      dimensions: data.embedding.values.length,
      model,
      tokens: request.text.split(' ').length
    }
  }

  /**
   * Private method: Generate embeddings using OpenAI API
   */
  private async generateOpenAIEmbedding(request: EmbeddingRequest, config: LLMConfig): Promise<EmbeddingResponse> {
    const model = request.model ?? 'text-embedding-3-small'

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model,
        input: request.text
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`OpenAI Embedding API error: ${data.error?.message ?? 'Unknown error'}`)
    }

    return {
      embedding: data.data[0].embedding,
      dimensions: data.data[0].embedding.length,
      model,
      tokens: data.usage.total_tokens
    }
  }

  /**
   * Private method: Get available models from Ollama
   */
  private async getOllamaModels(config: LLMConfig): Promise<string[]> {
    const baseUrl = config.baseUrl ?? 'http://localhost:11434'

    try {
      const response = await fetch(`${baseUrl}/api/tags`)
      const data = await response.json()
      return data.models?.map((model: any) => model.name) ?? []
    } catch {
      return []
    }
  }

  /**
   * Private method: Get available models from LM Studio
   */
  private async getLMStudioModels(config: LLMConfig): Promise<string[]> {
    const baseUrl = config.baseUrl ?? 'http://localhost:1234'

    try {
      const response = await fetch(`${baseUrl}/v1/models`)
      const data = await response.json()
      return data.data?.map((model: any) => model.id) ?? []
    } catch {
      return []
    }
  }

  /**
   * Private method: Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let magnitudeA = 0
    let magnitudeB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      magnitudeA += a[i] * a[i]
      magnitudeB += b[i] * b[i]
    }

    magnitudeA = Math.sqrt(magnitudeA)
    magnitudeB = Math.sqrt(magnitudeB)

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0
    }

    return dotProduct / (magnitudeA * magnitudeB)
  }
}