/**
 * Core AI service for multi-LLM integration
 * 
 * Implements the "AI agents that can traverse and process information" concept
 * from the project blueprint. Supports multiple LLM providers (Gemini, OpenAI, Local)
 * with unified interface for cognitive graph processing.
 * 
 * @module AIService
 */

/**
 * Supported LLM providers for the cognitive graph studio
 */
export type LLMProvider = 'gemini' | 'openai' | 'anthropic' | 'local-ollama' | 'local-lm-studio'

/**
 * LLM configuration for provider connection
 */
export interface LLMConfig {
  provider: LLMProvider
  apiKey?: string
  baseUrl?: string
  model: string
  temperature?: number
  maxTokens?: number
  timeout?: number
}

/**
 * LLM request parameters for text generation
 */
export interface LLMRequest {
  prompt: string
  systemPrompt?: string
  context?: string[]
  temperature?: number
  maxTokens?: number
  format?: 'text' | 'json'
}

/**
 * LLM response with metadata
 */
export interface LLMResponse {
  content: string
  metadata: {
    model: string
    provider: LLMProvider
    tokens: {
      input: number
      output: number
      total: number
    }
    latency: number
    confidence?: number
  }
  error?: string
}

/**
 * Embedding generation request
 */
export interface EmbeddingRequest {
  text: string
  model?: string
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embedding: number[]
  dimensions: number
  model: string
  tokens: number
}

/**
 * Multi-LLM service interface for cognitive graph AI operations
 * 
 * Provides unified access to different LLM providers while maintaining
 * provider-specific optimizations and capabilities.
 */
export interface IAIService {
  /**
   * Generate text completion using specified LLM provider
   * @param request - LLM request parameters
   * @param config - Optional provider configuration override
   * @returns Promise resolving to LLM response
   */
  generateText(request: LLMRequest, config?: Partial<LLMConfig>): Promise<LLMResponse>

  /**
   * Generate embeddings for semantic search
   * @param request - Embedding request parameters
   * @param config - Optional provider configuration override
   * @returns Promise resolving to embedding vector
   */
  generateEmbedding(request: EmbeddingRequest, config?: Partial<LLMConfig>): Promise<EmbeddingResponse>

  /**
   * Test connectivity to LLM provider
   * @param provider - Provider to test
   * @returns Promise resolving to connection status
   */
  testConnection(provider: LLMProvider): Promise<boolean>

  /**
   * Get available models for provider
   * @param provider - Provider to query
   * @returns Promise resolving to available model list
   */
  getAvailableModels(provider: LLMProvider): Promise<string[]>

  /**
   * Calculate semantic similarity between texts
   * @param text1 - First text for comparison
   * @param text2 - Second text for comparison
   * @returns Promise resolving to similarity score (0-1)
   */
  calculateSimilarity(text1: string, text2: string): Promise<number>
}

/**
 * AI service implementation with multi-provider support
 * 
 * Handles connection management, request routing, and response normalization
 * across different LLM providers for cognitive graph operations.
 */
export class AIService implements IAIService {
  private providers: Map<LLMProvider, LLMConfig> = new Map()
  private defaultProvider: LLMProvider = 'gemini'
  private embeddingCache: Map<string, EmbeddingResponse> = new Map()

  /**
   * Initialize AI service with provider configurations
   * @param configs - Array of LLM provider configurations
   * @param defaultProvider - Default provider for requests
   */
  constructor(configs: LLMConfig[], defaultProvider?: LLMProvider) {
    configs.forEach(config => {
      this.providers.set(config.provider, config)
    })
    
    if (defaultProvider) {
      this.defaultProvider = defaultProvider
    }
  }

  /**
   * Generate text completion using specified or default provider
   */
  async generateText(request: LLMRequest, config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const provider = config?.provider ?? this.defaultProvider
    const providerConfig = this.providers.get(provider)
    
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`)
    }

    const startTime = Date.now()
    
    try {
      switch (provider) {
        case 'gemini':
          return await this.generateGeminiText(request, providerConfig)
        case 'openai':
          return await this.generateOpenAIText(request, providerConfig)
        case 'anthropic':
          return await this.generateAnthropicText(request, providerConfig)
        case 'local-ollama':
          return await this.generateOllamaText(request, providerConfig)
        case 'local-lm-studio':
          return await this.generateLMStudioText(request, providerConfig)
        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }
    } catch (error) {
      return {
        content: '',
        metadata: {
          model: providerConfig.model,
          provider,
          tokens: { input: 0, output: 0, total: 0 },
          latency: Date.now() - startTime
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate embeddings with caching for performance
   */
  async generateEmbedding(request: EmbeddingRequest, config?: Partial<LLMConfig>): Promise<EmbeddingResponse> {
    const cacheKey = `${request.text}:${request.model ?? 'default'}`
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!
    }

    const provider = config?.provider ?? this.defaultProvider
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
   * Test connection to specific provider
   */
  async testConnection(provider: LLMProvider): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        prompt: 'test',
        maxTokens: 1
      }
      
      await this.generateText(testRequest, { provider })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get available models for provider
   */
  async getAvailableModels(provider: LLMProvider): Promise<string[]> {
    const providerConfig = this.providers.get(provider)
    
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`)
    }

    switch (provider) {
      case 'gemini':
        return ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
      case 'openai':
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
      case 'anthropic':
        return ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
      case 'local-ollama':
        return await this.getOllamaModels(providerConfig)
      case 'local-lm-studio':
        return await this.getLMStudioModels(providerConfig)
      default:
        return []
    }
  }

  /**
   * Calculate semantic similarity using embeddings
   */
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    const [embedding1, embedding2] = await Promise.all([
      this.generateEmbedding({ text: text1 }),
      this.generateEmbedding({ text: text2 })
    ])

    return this.cosineSimilarity(embedding1.embedding, embedding2.embedding)
  }

  /**
   * Private method: Generate text using Gemini API
   */
  private async generateGeminiText(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: request.temperature ?? config.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? config.maxTokens ?? 1000,
          responseMimeType: request.format === 'json' ? 'application/json' : 'text/plain'
        }
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${data.error?.message ?? 'Unknown error'}`)
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    
    return {
      content,
      metadata: {
        model: config.model,
        provider: 'gemini',
        tokens: {
          input: data.usageMetadata?.promptTokenCount ?? 0,
          output: data.usageMetadata?.candidatesTokenCount ?? 0,
          total: data.usageMetadata?.totalTokenCount ?? 0
        },
        latency: 0 // Will be set by caller
      }
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
